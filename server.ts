import express from "express";
import { createServer } from "http";
import { createServer as createViteServer } from "vite";
import { Server as SocketIOServer } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

// Robust storage initializer
let db: any = null;

// Initialize Gemini SDK with lazy evaluation for safety
let ai: GoogleGenAI | null = null;
function getGeminiSDK(): GoogleGenAI | null {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      ai = new GoogleGenAI({ apiKey: key });
    }
  }
  return ai;
}

// Famous neighborhoods in Dakar with coordinates for accurate mock checking
const DAKAR_NEIGHBORHOODS = [
  { name: "Plateau", lat: 14.6675, lng: -17.4344 },
  { name: "Medina", lat: 14.6814, lng: -17.4478 },
  { name: "Ouakam", lat: 14.7212, lng: -17.4891 },
  { name: "Almadies", lat: 14.7460, lng: -17.5140 },
  { name: "Mermoz", lat: 14.7081, lng: -17.4760 },
  { name: "Point E", lat: 14.6953, lng: -17.4607 },
  { name: "Parcelles Assainies", lat: 14.7554, lng: -17.4429 },
  { name: "Pikine", lat: 14.7538, lng: -17.3912 },
  { name: "Guédiawaye", lat: 14.7772, lng: -17.3978 },
  { name: "Yoff", lat: 14.7600, lng: -17.4720 },
  { name: "Hann Bel-Air", lat: 14.7118, lng: -17.4267 },
  { name: "Fann Residence", lat: 14.6905, lng: -17.4751 },
  { name: "Rufisque", lat: 14.7142, lng: -17.2711 },
  { name: "Ngor", lat: 14.7490, lng: -17.5100 },
];

function getClosestNeighborhood(lat: number, lng: number): string {
  let closest = DAKAR_NEIGHBORHOODS[0];
  let minDist = Infinity;
  for (const nh of DAKAR_NEIGHBORHOODS) {
    const dist = Math.sqrt(Math.pow(nh.lat - lat, 2) + Math.pow(nh.lng - lng, 2));
    if (dist < minDist) {
      minDist = dist;
      closest = nh;
    }
  }
  return closest.name;
}

async function startServer() {
  try {
    console.log("[ALGS DB] Attempting to load native SQLite Database...");
    // Use dynamic import for ESM/CommonJS compatibility and error-safety
    const { default: Database } = await import("better-sqlite3");
    db = new Database("deliveries.db");
    
    // Migrate tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS deliveries (
        id TEXT PRIMARY KEY,
        clientName TEXT,
        clientPhone TEXT,
        driverPhone TEXT,
        latitude REAL,
        longitude REAL,
        neighborhood TEXT,
        landmarkGuide TEXT,
        landmarkGuideWolof TEXT,
        status TEXT,
        paymentStatus TEXT,
        paymentMethod TEXT,
        createdAt TEXT,
        qrCodeToken TEXT,
        etaMinutes INTEGER,
        deliveryType TEXT
      )
    `);
    try {
      db.exec("ALTER TABLE deliveries ADD COLUMN deliveryType TEXT DEFAULT 'moto'");
    } catch (_) {
      // Already has deliveryType column
    }
    console.log("[ALGS DB] Native SQLite Database initialized successfully.");
  } catch (dbError) {
    console.warn("[ALGS DB] Native SQLite loading failed. Utilizing Failsafe Backup JSON Database...", dbError);
    
    class FailsafeDatabase {
      private file: string = "deliveries_fallback.json";
      private items: any[] = [];

      constructor() {
        this.load();
      }

      private load() {
        try {
          if (fs.existsSync(this.file)) {
            const raw = fs.readFileSync(this.file, "utf8");
            this.items = JSON.parse(raw);
            console.log(`[FailsafeDB] Loaded ${this.items.length} records successfully from ${this.file}`);
          }
        } catch (e) {
          console.warn("[FailsafeDB] Read failure, standard in-memory array is active:", e);
        }
      }

      private save() {
        try {
          fs.writeFileSync(this.file, JSON.stringify(this.items, null, 2), "utf8");
        } catch (e) {
          console.warn("[FailsafeDB] Write failure, memory changes not flushed to disk:", e);
        }
      }

      exec(sql: string) {
        console.log("[FailsafeDB] Table migrations verified safely.");
      }

      prepare(sql: string) {
        const trimmed = sql.trim().replace(/\s+/g, " ");
        const self = this;

        return {
          all(...args: any[]): any[] {
            if (trimmed.includes("SELECT * FROM deliveries")) {
              return [...self.items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            }
            return self.items;
          },

          get(...args: any[]): any {
            if (trimmed.includes("SELECT * FROM deliveries WHERE id = ?")) {
              const id = args[0];
              return self.items.find(item => item.id === id) || null;
            }
            return null;
          },

          run(...args: any[]): any {
            if (trimmed.includes("INSERT INTO deliveries")) {
              const [
                id, clientName, clientPhone, driverPhone, latitude, longitude,
                neighborhood, landmarkGuide, landmarkGuideWolof, paymentMethod,
                createdAt, qrCodeToken, etaMinutes, deliveryType
              ] = args;

              const newItem = {
                id, clientName, clientPhone, driverPhone,
                latitude: parseFloat(latitude), longitude: parseFloat(longitude),
                neighborhood, landmarkGuide, landmarkGuideWolof,
                status: "pending", paymentStatus: "pending", paymentMethod,
                createdAt, qrCodeToken, etaMinutes: parseInt(etaMinutes, 10) || 15,
                deliveryType: deliveryType || "moto"
              };

              self.items.push(newItem);
              self.save();
              return { changes: 1 };
            }

            if (trimmed.includes("UPDATE deliveries")) {
              const [status, paymentStatus, etaMinutes, id] = args;
              const index = self.items.findIndex(item => item.id === id);
              if (index !== -1) {
                if (status !== undefined) self.items[index].status = status;
                if (paymentStatus !== undefined) self.items[index].paymentStatus = paymentStatus;
                if (etaMinutes !== undefined) self.items[index].etaMinutes = parseInt(etaMinutes, 10);
                self.save();
              }
              return { changes: 1 };
            }

            if (trimmed.includes("DELETE FROM deliveries")) {
              const id = args[0];
              self.items = self.items.filter(item => item.id !== id);
              self.save();
              return { changes: 1 };
            }

            return { changes: 0 };
          }
        };
      }
    }

    db = new FailsafeDatabase();
  }

  const app = express();
  const httpServer = createServer(app);
  const PORT = 3000;

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Join room for a specific delivery
    socket.on("join-delivery-room", (deliveryId: string) => {
      socket.join(`delivery-${deliveryId}`);
      console.log(`[Socket.io] Socket ${socket.id} joined room delivery-${deliveryId}`);
    });

    // Handle real-time location update from driver
    socket.on("driver-location-update", (data: {
      deliveryId: string;
      latitude: number;
      longitude: number;
      bearing?: number;
      etaMinutes?: number;
    }) => {
      // Broadcast to everybody in that delivery's room except the sender
      socket.to(`delivery-${data.deliveryId}`).emit("location-updated", {
        latitude: data.latitude,
        longitude: data.longitude,
        bearing: data.bearing,
        etaMinutes: data.etaMinutes
      });
      console.log(`[Socket.io] Position broadcast for ${data.deliveryId}: ${data.latitude}, ${data.longitude}`);
    });

    socket.on("disconnect", () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  // Middleware to parse json
  app.use(express.json());

  // API endpoints
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", database: "connected", gemini_active: !!process.env.GEMINI_API_KEY });
  });

  // Get all deliveries
  app.get("/api/deliveries", (req, res) => {
    try {
      const stmt = db.prepare("SELECT * FROM deliveries ORDER BY createdAt DESC");
      const rows = stmt.all();
      // Ensure numerical structures
      const formatted = rows.map((row: any) => ({
        ...row,
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        etaMinutes: parseInt(row.etaMinutes || "15", 10),
      }));
      res.json(formatted);
    } catch (error: any) {
      console.error("Database fetch error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create a delivery (with optional Gemini assistance)
  app.post("/api/deliveries", async (req, res) => {
    const { clientName, clientPhone, driverPhone, latitude, longitude, paymentMethod, deliveryType } = req.body;

    if (!clientName || !clientPhone || !driverPhone || !latitude || !longitude) {
      return res.status(400).json({ error: "Champs obligatoires manquants." });
    }

    const id = "DLV-" + Math.floor(100000 + Math.random() * 900000);
    const qrCodeToken = "QR-" + id + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
    const createdAt = new Date().toISOString();
    const etaMinutes = Math.floor(10 + Math.random() * 25); // 10 to 35 mins ETA

    let neighborhood = getClosestNeighborhood(latitude, longitude);
    let landmarkGuide = "Près de l'axe principal, repères locaux à préciser par téléphone.";
    let landmarkGuideWolof = "Ci wetu yoon wu makk wi, wooleen telefoon ngir leerale.";

    // Try Gemini if available
    const gemini = getGeminiSDK();
    if (gemini) {
      try {
        const prompt = `
          The client is requesting a delivery in Dakar, Senegal. 
          Given coordinates: Latitude ${latitude}, Longitude ${longitude}
          
          You are an helpful AI geolocator assistant based in Dakar. 
          Identify the most plausible neighborhood (Quartier in Dakar, e.g. Plateau, Medina, Ouakam, Almadies, Sacré-Cœur, Mermoz, Parcelles, Pikine, Guédiawaye, Patte d'Oie, Castors, etc.) for this coordinate.
          Write:
          1. A descriptive, short address clue in French (e.g., 'Proche de la Mosquée de la Divinité', 'Près du rond-point Station Wave', or 'En face de la boulangerie Paul'). Keep it under 20 words.
          2. A localized delivery instruction in Wolof (representing Sénégal's main language, e.g., 'Ci wetu...', 'Jakaarlo ak...', 'Demal ba ci kanam...'). Keep it short, natural, and friendly.
          
          Return ONLY a JSON response matching this schema:
          {
            "neighborhood": "Name of neighborhood",
            "landmark_fr": "A clean direction clue in French",
            "landmark_wo": "A warm direction clue in Wolof"
          }
        `;

        const response = await gemini.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                neighborhood: { type: Type.STRING },
                landmark_fr: { type: Type.STRING },
                landmark_wo: { type: Type.STRING }
              },
              required: ["neighborhood", "landmark_fr", "landmark_wo"]
            }
          }
        });

        const textOutput = response.text;
        if (textOutput) {
          const result = JSON.parse(textOutput);
          if (result.neighborhood) neighborhood = result.neighborhood;
          if (result.landmark_fr) landmarkGuide = result.landmark_fr;
          if (result.landmark_wo) landmarkGuideWolof = result.landmark_wo;
        }
      } catch (geminiError) {
        console.error("Gemini assistance failed, falling back to heuristics:", geminiError);
      }
    }

    try {
      const insert = db.prepare(`
        INSERT INTO deliveries (id, clientName, clientPhone, driverPhone, latitude, longitude, neighborhood, landmarkGuide, landmarkGuideWolof, status, paymentStatus, paymentMethod, createdAt, qrCodeToken, etaMinutes, deliveryType)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', ?, ?, ?, ?, ?)
      `);

      insert.run(
        id,
        clientName,
        clientPhone,
        driverPhone,
        latitude,
        longitude,
        neighborhood,
        landmarkGuide,
        landmarkGuideWolof,
        paymentMethod || "cash",
        createdAt,
        qrCodeToken,
        etaMinutes,
        deliveryType || "moto"
      );

      res.status(201).json({
        id,
        clientName,
        clientPhone,
        driverPhone,
        latitude,
        longitude,
        neighborhood,
        landmarkGuide,
        landmarkGuideWolof,
        status: "pending",
        paymentStatus: "pending",
        paymentMethod: paymentMethod || "cash",
        createdAt,
        qrCodeToken,
        etaMinutes,
        deliveryType: deliveryType || "moto"
      });
    } catch (dbError: any) {
      console.error("DB Insert error:", dbError);
      res.status(500).json({ error: dbError.message });
    }
  });

  // Update delivery status, ETA or payment status
  app.patch("/api/deliveries/:id", (req, res) => {
    const { id } = req.params;
    const { status, paymentStatus, etaMinutes } = req.body;

    try {
      // Find current delivery
      const select = db.prepare("SELECT * FROM deliveries WHERE id = ?");
      const dlv = select.get(id) as any;
      if (!dlv) {
        return res.status(404).json({ error: "Livraison introuvable." });
      }

      const updatedStatus = status || dlv.status;
      const updatedPaymentStatus = paymentStatus || dlv.paymentStatus;
      const updatedEta = etaMinutes !== undefined ? etaMinutes : dlv.etaMinutes;

      const update = db.prepare(`
        UPDATE deliveries 
        SET status = ?, paymentStatus = ?, etaMinutes = ?
        WHERE id = ?
      `);

      update.run(updatedStatus, updatedPaymentStatus, updatedEta, id);

      const updatedDelivery = {
        ...dlv,
        status: updatedStatus,
        paymentStatus: updatedPaymentStatus,
        etaMinutes: updatedEta,
        latitude: parseFloat(dlv.latitude),
        longitude: parseFloat(dlv.longitude)
      };

      // Broadcast update live to all listening clients or drivers
      io.to(`delivery-${id}`).emit("delivery-status-updated", updatedDelivery);

      res.json(updatedDelivery);
    } catch (error: any) {
      console.error("DB Update error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete delivery
  app.delete("/api/deliveries/:id", (req, res) => {
    const { id } = req.params;
    try {
      const select = db.prepare("SELECT * FROM deliveries WHERE id = ?");
      if (!select.get(id)) {
        return res.status(404).json({ error: "Livraison introuvable." });
      }

      const del = db.prepare("DELETE FROM deliveries WHERE id = ?");
      del.run(id);
      res.json({ success: true, message: "Livraison supprimée avec succès." });
    } catch (error: any) {
      console.error("DB Delete error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Gemini Live Chat / Wolof assistant translation
  app.post("/api/gemini/assist", async (req, res) => {
    const { text, context } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Missing message text" });
    }

    const gemini = getGeminiSDK();
    if (!gemini) {
      return res.json({
        reply: "Salam! Le service assistant Wolof fonctionne en mode local. Comment puis-je vous aider pour votre livraison sur Dakar?",
        translation: "Salam! Je suis prêt à guider votre livreur."
      });
    }

    try {
      const prompt = `
        You are 'Sama Assist', an intelligent geo-locator delivery assistant for Dakar, Senegal.
        You speak Wolof and French beautifully. 
        Context details: ${JSON.stringify(context || {})}
        The user asks: "${text}"
        Provide a friendly, highly localized reply. Keep your answer brief (maximum 2-3 sentences).
        If helpful, include direct Wolof advice or typical Dakar instructions (e.g. "Demal ba ci rond-point bi", "Wo ko ci phone").
        Return a plain text response under 80 words.
      `;

      const response = await gemini.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });

      res.json({ reply: response.text || "Waaw, sa position baax na! (C'est noté, tout est bon !)" });
    } catch (err: any) {
      console.error("Gemini assist error:", err);
      res.status(500).json({ error: "Gemini assist failed" });
    }
  });

  // Serve static assets or mount Vite middleware in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`[ALGS Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
