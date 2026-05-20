import React, { useState, useEffect, useRef } from 'react';
import { useDelivery } from '../context/DeliveryContext';
import { Delivery } from '../types';
import { 
  User, 
  Phone, 
  MapPin, 
  Smartphone, 
  AlertCircle,
  Clock, 
  ListOrdered, 
  MessageSquare, 
  CheckCircle, 
  Play, 
  Trash2, 
  Volume2, 
  QrCode, 
  Sparkles,
  RefreshCw,
  Send,
  Navigation,
  Compass,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import MobileMoneyModal from './MobileMoneyModal';
import GameMap from './GameMap';

export default function GameSidebar() {
  const {
    deliveries,
    activeDelivery,
    setActiveDelivery,
    selectedLocation,
    activeRole,
    setActiveRole,
    soundGuideLanguage,
    setSoundGuideLanguage,
    createDelivery,
    updateDeliveryStatus,
    deleteDelivery,
    speakInstruction,
    fetchDeliveries,
    isSyncError,
    isRealGPSEnabled,
    setIsRealGPSEnabled
  } = useDelivery();

  // PWA install trigger state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsAppInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA Install] User choice: ${outcome}`);
    setDeferredPrompt(null);
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtTop, setIsAtTop] = useState(true);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setIsAtTop(target.scrollTop < 80);
  };

  const handleToggleScroll = () => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    if (isAtTop) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    } else {
      container.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  // Mode tabs: 'delivery_form' | 'tracking' | 'history' | 'ai_assistant'
  const [activeTab, setActiveTab] = useState<'delivery_form' | 'tracking' | 'history' | 'ai_assistant'>('delivery_form');
  const [showMap, setShowMap] = useState(true);

  // Form states
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('77');
  const [driverPhone, setDriverPhone] = useState('76');
  const [paymentMethod, setPaymentMethod] = useState<'wave' | 'orange_money' | 'free_money' | 'cash'>('cash');
  const [deliveryType, setDeliveryType] = useState<'moto' | 'voiture'>('moto');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payment popup state
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);

  // Dynamic Chat with Gemini Assistant
  const [chatMessage, setChatMessage] = useState('');
  const [chatResponse, setChatResponse] = useState('Salam! Je suis Sama Assist, votre copilote Dakarois. Demandez-moi des explications de zones sans adresse, des traductions en Wolof, ou posez-moi vos questions de livraison !');
  const [isTyping, setIsTyping] = useState(false);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientPhone.trim() || !driverPhone.trim()) {
      alert("Veuillez remplir correctement tous les champs.");
      return;
    }

    setIsSubmitting(true);
    try {
      const newDlv = await createDelivery(
        clientName,
        clientPhone,
        driverPhone,
        paymentMethod,
        deliveryType
      );

      // Welcome audio clip
      speakInstruction(
        `Livraison initiée à ${newDlv.neighborhood}. Partagez la position par WhatsApp.`,
        `Livraison bi komanséna ci ${newDlv.neighborhood}. Yonnee-l sa position ci WhatsApp.`,
        soundGuideLanguage
      );

      // Auto route to active tracking view
      setActiveTab('tracking');

      // Reset form
      setClientName('');
      setClientPhone('77');
      setDriverPhone('76');
    } catch (err: any) {
      alert("Erreur de création : " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsAppShare = () => {
    if (!activeDelivery) return;

    const lat = activeDelivery.latitude.toFixed(6);
    const lng = activeDelivery.longitude.toFixed(6);
    
    // Structure beautiful local senegalese message
    const rawMessage = `Salam waaleykum! C'est ${activeDelivery.clientName}. Voici ma position exacte de livraison par ALGS Delivery (Sama Position) :
📍 https://www.google.com/maps?q=${lat},${lng}

🛵 Type de livraison: ${activeDelivery.deliveryType === 'voiture' ? '🚗 Voiture (Colis standard)' : '🏍️ Moto (Livraison rapide)'}
🏡 Quartier: ${activeDelivery.neighborhood}
💡 Indications: ${activeDelivery.landmarkGuide}
🗣️ Wolof: ${activeDelivery.landmarkGuideWolof}
💵 Paiement: ${activeDelivery.paymentMethod.toUpperCase()} (${activeDelivery.paymentStatus === 'completed' ? 'PAYÉ' : 'À PAYER'})
📦 Code Commande: ${activeDelivery.id}

Cliquez sur le lien pour ouvrir Google Maps et démarrer le GPS.`;

    const encodedText = encodeURIComponent(rawMessage);
    const tel = activeDelivery.driverPhone.startsWith('+221') 
      ? activeDelivery.driverPhone 
      : `+221${activeDelivery.driverPhone}`;
      
    const whatsappLink = `https://wa.me/${tel}?text=${encodedText}`;
    window.open(whatsappLink, '_blank');
  };

  const executeStatusUpdate = async (status: 'pending' | 'shipping' | 'delivered') => {
    if (!activeDelivery) return;
    
    await updateDeliveryStatus(activeDelivery.id, status, activeDelivery.paymentStatus);
    
    // Vocal updates
    if (status === 'shipping') {
      speakInstruction(
        `Le livreur a démarré la livraison vers ${activeDelivery.neighborhood}. Le suivi en temps réel est activé.`,
        `Livreur bi mu ngi demal ba ci ${activeDelivery.neighborhood}. Suivez le scooter ci carte bi.`,
        soundGuideLanguage
      );
    } else if (status === 'delivered') {
      speakInstruction(
        `Colis livré avec succès à ${activeDelivery.clientName}. Jërëjëf !`,
        `Colis bi sotti na ci jamm ci ${activeDelivery.clientName}. Jërëjëf !`,
        soundGuideLanguage
      );
    }
  };

  // Chat request with Gemini
  const submitChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    setIsTyping(true);
    const currentMsg = chatMessage;
    setChatMessage('');

    try {
      const resp = await fetch('/api/gemini/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: currentMsg,
          context: {
            selectedLocation,
            activeDeliveryId: activeDelivery?.id,
            activeRole
          }
        })
      });

      if (resp.ok) {
        const data = await resp.json();
        setChatResponse(data.reply);
        // Play response out loud ! Let's read in Wolof or French depending on language set
        speakInstruction(data.reply, data.reply, soundGuideLanguage);
      }
    } catch (err) {
      console.error(err);
      setChatResponse("Désolé, Sama Assist a rencontré un petit problème. Veuillez réessayer !");
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 text-slate-100 font-sans border-r border-slate-800 relative">
      
      {/* 1. Header (Aesthetic Senegal Flag styling + Bold layout) */}
      <div className="p-6 shrink-0 bg-slate-950 border-b border-slate-800 relative overflow-hidden">
        {/* Flag line indicator */}
        <div className="absolute top-0 left-0 right-0 h-1 flex">
          <div className="h-full bg-emerald-500 flex-1" />
          <div className="h-full bg-yellow-400 flex-1" />
          <div className="h-full bg-red-500 flex-1" />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center text-slate-900 font-extrabold shadow-md transform -rotate-6">
              🇸🇳
            </div>
            <div>
              <h1 className="text-xl font-black text-white leading-none font-display uppercase tracking-tight">ALGS Delivery</h1>
              <p className="text-[10px] text-emerald-400 tracking-wider uppercase font-mono mt-0.5">Sama Position Sénégal</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            {isSyncError ? (
              <div 
                className="h-8 px-2.5 rounded bg-amber-950/40 border border-amber-800/60 flex items-center gap-1.5 text-[10px] text-amber-400 font-extrabold uppercase tracking-wide font-mono animate-pulse"
                title="Déconnexion temporaire - Reconnexion en cours..."
              >
                <RefreshCw className="w-3 h-3 animate-spin text-amber-500" />
                Dakar Sync...
              </div>
            ) : (
              <button 
                id="refresh-all-btn"
                onClick={fetchDeliveries}
                className="p-1 px-2.5 h-8 rounded bg-slate-800/80 hover:bg-slate-800 text-xs text-slate-300 transition flex items-center gap-1 border border-slate-700 font-mono cursor-pointer"
                title="Actualiser les livraisons"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Sync
              </button>
            )}
          </div>
        </div>

        {/* PWA Promotion installation helper */}
        {deferredPrompt && (
          <div className="mt-4 p-3 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/25 rounded-2xl flex items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-500/15 text-emerald-400 rounded-lg shrink-0">
                <Smartphone className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-white leading-tight">Installer l'application ALGS</h4>
                <p className="text-[10px] text-slate-400 leading-tight">Ajouter raccourci écran d'accueil (sans Play Store)</p>
              </div>
            </div>
            <button
              id="pwa-install-banner-btn"
              type="button"
              onClick={handleInstallClick}
              className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-xl transition cursor-pointer shrink-0"
            >
              Installer 📲
            </button>
          </div>
        )}

        {/* Côté client vs livreur switchers */}
        <div className="grid grid-cols-2 gap-2 mt-5 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
          <button
            id="role-client-btn"
            onClick={() => {
              setActiveRole('client');
              speakInstruction("Menu client activé. Renseignez vos détails.", "Menu client sotti na. Binda-lo sa details.", 'fr');
            }}
            className={`py-2 px-3 text-xs font-extrabold rounded-xl transition duration-200 uppercase tracking-wider flex items-center justify-center gap-1.5 ${activeRole === 'client' ? 'bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/10' : 'text-slate-400 hover:text-white'}`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            📱 Client
          </button>
          
          <button
            id="role-livreur-btn"
            onClick={() => {
              setActiveRole('driver');
              speakInstruction("Menu chauffeur activé. Consultez la liste des courses.", "Menu livreur sotti na. Seet-el sa cours yi.", 'fr');
            }}
            className={`py-2 px-3 text-xs font-extrabold rounded-xl transition duration-200 uppercase tracking-wider flex items-center justify-center gap-1.5 ${activeRole === 'driver' ? 'bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-400/10' : 'text-slate-400 hover:text-white'}`}
          >
            🛵 Chauffeur
          </button>
        </div>

        {/* Toggleable Embedded Map visualizer */}
        <button
          id="toggle-map-radar-vis"
          onClick={() => setShowMap(!showMap)}
          className={`mt-3.5 md:hidden w-full py-2.5 px-3 rounded-xl text-[11px] font-black transition duration-200 flex items-center justify-center gap-2 border uppercase tracking-widest ${
            showMap
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/15'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-slate-300'
          }`}
          title="Afficher ou masquer la carte tactique radar géolocalisée"
        >
          <Compass className={`w-3.5 h-3.5 ${showMap ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
          {showMap ? 'Masquer la Carte Radar 🗺️' : 'Afficher la Carte Radar 🗺️'}
        </button>
      </div>

      {/* 2. Audio Vocal Options Indicator */}
      <div className="px-6 py-2 shrink-0 bg-slate-950/50 border-b border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Instructions vocales d'assistance :</span>
        </div>
        <div className="flex gap-2">
          <button
            id="audio-lang-fr-btn"
            className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${soundGuideLanguage === 'fr' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40' : 'hover:text-slate-200'}`}
            onClick={() => setSoundGuideLanguage('fr')}
          >
            Français
          </button>
          <button
            id="audio-lang-wo-btn"
            className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${soundGuideLanguage === 'wo' ? 'bg-amber-400/15 text-amber-400 border border-amber-400/40' : 'hover:text-slate-200'}`}
            onClick={() => setSoundGuideLanguage('wo')}
          >
            Wolof 🇸🇳
          </button>
        </div>
      </div>

      {/* 3. Navigation Tabs in Sidebar context */}
      <div className="p-3 bg-slate-900 border-b border-slate-800/80 shrink-0 flex gap-1 overflow-x-auto whitespace-nowrap">
        {activeRole === 'client' ? (
          <>
            <button
              id="tab-form-btn"
              onClick={() => setActiveTab('delivery_form')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${activeTab === 'delivery_form' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              🚀 Partager GPS
            </button>
            <button
              id="tab-track-btn"
              onClick={() => setActiveTab('tracking')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${activeTab === 'tracking' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              🛵 Suivi Actif
            </button>
          </>
        ) : (
          <>
            <button
              id="tab-pending-btn"
              onClick={() => setActiveTab('tracking')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${activeTab === 'tracking' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              🛵 Courses
            </button>
          </>
        )}
        <button
          id="tab-history-btn"
          onClick={() => setActiveTab('history')}
          className={`py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${activeTab === 'history' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <Clock className="w-3.5 h-3.5" />
          Précédents
        </button>
        <button
          id="tab-assist-btn"
          onClick={() => setActiveTab('ai_assistant')}
          className={`py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${activeTab === 'ai_assistant' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/40 hover:bg-emerald-900/30' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Sama IA
        </button>
      </div>

      {/* 4. Scrollable Dynamic Body */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-5 space-y-5"
      >
        
        {/* Dynamic Map Visualizer Radar embedded within the single viewport */}
        {showMap && (
          <div className="w-full md:hidden shrink-0 h-[400px] mb-2 rounded-3xl overflow-hidden border border-slate-800 shadow-xl relative z-10">
            <GameMap />
          </div>
        )}
        
        {/* TAB 4.1 : CLIENT - NEW DELIVERY FORM */}
        {activeTab === 'delivery_form' && activeRole === 'client' && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
              <span className="text-[9px] font-extrabold uppercase bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full font-mono">
                Étape Principale
              </span>
              <h3 className="text-sm font-bold text-slate-100 mt-2">Dakar Adressage Simplifié</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Renseignez vos coordonnées, sélectionnez le pin sur la carte puis cliquez sur le bouton vert ! ALGS s'occupe de formater le message idéal pour votre chauffeur dakarois.
              </p>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              {/* Client Info */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
                  Votre Nom
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Moussa Ndiaye, Fatou Fall, etc."
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-medium placeholder-slate-600 transition"
                  />
                </div>
              </div>

              {/* Client Tel */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
                  Votre Téléphone (WhatsApp Client)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="tel"
                    required
                    placeholder="77 123 45 67"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-mono focus:ring-1 focus:ring-emerald-500 transition"
                  />
                </div>
              </div>

              {/* Driver Tel */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
                  Téléphone du Livreur (WhatsApp Livreur)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="tel"
                    required
                    placeholder="76 123 45 67"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-mono transition"
                  />
                </div>
              </div>

              {/* Coordinates Indicator */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-mono font-bold">Repères Détectés</p>
                  <p className="text-xs text-slate-300 font-mono mt-0.5">
                    {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                    Dakar GPS
                  </span>
                </div>
              </div>

              {/* Moyen de Transport (Moto vs Voiture) */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  Moyen de Transport
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDeliveryType('moto')}
                    className={`py-3 px-4 rounded-xl border text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 transition duration-200 cursor-pointer ${
                      deliveryType === 'moto'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <span>🛵</span> Moto Livraison
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryType('voiture')}
                    className={`py-3 px-4 rounded-xl border text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 transition duration-200 cursor-pointer ${
                      deliveryType === 'voiture'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <span>🚗</span> Voiture Colis
                  </button>
                </div>
              </div>

              {/* Payment Mode */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
                  Moyen de paiement souhaité
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e: any) => setPaymentMethod(e.target.value)}
                  className="w-full py-3 px-4 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 outline-none focus:border-emerald-500 transition"
                >
                  <option value="cash">Paiement Cash à la livraison (Espèces)</option>
                  <option value="wave">Wave Sénégal (Électronique)</option>
                  <option value="orange_money">Orange Money (Électronique)</option>
                  <option value="free_money">Free Money (Électronique)</option>
                </select>
              </div>

              {/* Submit Button */}
              <button
                id="create-order-btn"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition duration-200 transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
              >
                {isSubmitting ? (
                  <>Création...</>
                ) : (
                  <>
                    <ShareIcon />
                    Partager pour {deliveryType === 'moto' ? 'Livraison Moto 🛵' : 'Colis Voiture 🚗'}
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* TAB 4.2 : TRACKING / ACTIVE INTERACTION PANELS */}
        {activeTab === 'tracking' && (
          <div className="space-y-5">
            {activeDelivery ? (
              <div className="space-y-4 animate-in fade-in duration-300">
                {/* Visual order ticket summary */}
                <div className="bg-slate-950 rounded-3xl p-5 border border-slate-800 space-y-4 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded font-mono">
                      ALGS LIVE-TRACKING
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono uppercase font-black">
                      REF: {activeDelivery.id}
                    </span>
                  </div>

                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase font-mono tracking-widest">
                        Destinataire Client
                      </p>
                      <h3 className="text-lg font-extrabold text-white mt-0.5">
                        {activeDelivery.clientName}
                      </h3>
                    </div>
                    {/* TYPE OF VEHICLE BADGE */}
                    <span className="text-[10px] font-bold uppercase bg-slate-900 border border-slate-800 text-slate-300 px-2.5 py-1.5 rounded-xl flex items-center gap-1 shrink-0 select-none">
                      {activeDelivery.deliveryType === 'voiture' ? (
                        <>
                          <span>🚗</span> Voiture
                        </>
                      ) : (
                        <>
                          <span>🛵</span> Moto
                        </>
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-indigo-400 flex items-center gap-1 font-semibold mt-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    {activeDelivery.neighborhood}
                  </p>

                  {/* Coordinates Info */}
                  <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-3.5 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-mono">Repère (FR) :</span>
                      <span className="font-bold text-slate-200 text-right max-w-[200px] truncate">{activeDelivery.landmarkGuide}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t border-slate-800/80 pt-2">
                      <span className="text-slate-500 font-mono">Repère (Wolof) :</span>
                      <span className="font-bold text-amber-400 text-right max-w-[200px] truncate">{activeDelivery.landmarkGuideWolof}</span>
                    </div>
                  </div>

                  {/* Payment Widget indicators */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase font-mono">PAIEMENT : {activeDelivery.paymentMethod.toUpperCase()}</p>
                      <p className={`font-extrabold mt-0.5 ${activeDelivery.paymentStatus === 'completed' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {activeDelivery.paymentStatus === 'completed' ? 'SÉCURISÉ & PAYÉ' : 'EN ATTENTE DE PAIEMENT'}
                      </p>
                    </div>
                    {activeDelivery.paymentStatus === 'pending' && activeDelivery.paymentMethod !== 'cash' && activeRole === 'client' && (
                      <button
                        id="open-pay-modal-btn"
                        onClick={() => setIsPayModalOpen(true)}
                        className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl transition duration-200 shrink-0"
                      >
                        Payer 💳
                      </button>
                    )}
                  </div>

                  {/* Sound Trigger indicators */}
                  <div className="flex gap-2">
                    <button
                      id="vocalize-fr-btn"
                      onClick={() => speakInstruction(activeDelivery.landmarkGuide, activeDelivery.landmarkGuideWolof, 'fr')}
                      className="flex-1 py-1.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs text-slate-300 font-bold flex items-center justify-center gap-1.5 transition"
                    >
                      <Volume2 className="w-4.5 h-4.5 text-slate-400" />
                      Auditer (FR)
                    </button>
                    <button
                      id="vocalize-wo-btn"
                      onClick={() => speakInstruction(activeDelivery.landmarkGuide, activeDelivery.landmarkGuideWolof, 'wo')}
                      className="flex-1 py-1.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs text-amber-400 font-bold flex items-center justify-center gap-1.5 transition"
                    >
                      <Volume2 className="w-4.5 h-4.5 text-amber-400" />
                      Auditer (WO) 🇸🇳
                    </button>
                  </div>
                </div>

                {/* ROLE ACCORDED ACTIONS */}
                {activeRole === 'client' ? (
                  <div className="space-y-3 p-4 bg-slate-950 border border-slate-800 rounded-3xl">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
                      Actions Client
                    </h4>

                    {/* WhatsApp Action */}
                    <button
                      id="whatsapp-share-btn"
                      onClick={handleWhatsAppShare}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm uppercase tracking-wider rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/10"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="mr-0.5"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.003 5.324 5.328 0 11.859 0c3.166.001 6.141 1.233 8.375 3.469 2.235 2.235 3.465 5.212 3.465 8.381 0 6.536-5.325 11.86-11.859 11.86h-.001c-2.007 0-3.982-.54-5.734-1.562L0 24zm6.59-4.846c1.6.95 3.197 1.45 4.817 1.455 5.516 0 10.002-4.485 10.002-10.003a9.92 9.92 0 0 0-2.922-7.076 9.92 9.92 0 0 0-7.078-2.922c-5.517 0-10.003 4.487-10.003 10.005a9.88 9.88 0 0 0 1.485 5.148l-.974 3.559 3.674-.966zm12.333-8.083c-.303-.151-1.793-.884-2.071-.985-.278-.102-.482-.151-.684.151-.202.303-.784.985-.961 1.186-.178.203-.356.227-.659.076-.303-.151-1.28-.471-2.44-1.503-.903-.805-1.512-1.8-1.69-2.102-.178-.303-.019-.467.132-.617.136-.135.303-.354.455-.53.151-.177.202-.303.303-.505.101-.202.051-.379-.025-.53-.076-.151-.685-1.651-.938-2.26-.247-.594-.5-.513-.684-.523-.177-.009-.379-.011-.582-.011-.202 0-.53.076-.807.379-.278.303-1.062 1.037-1.062 2.529 0 1.492 1.087 2.935 1.239 3.137.152.202 2.139 3.268 5.182 4.582.723.313 1.289.5 1.729.64.727.23 1.388.198 1.912.12.584-.087 1.793-.733 2.046-1.442.253-.709.253-1.316.177-1.442-.076-.126-.278-.202-.581-.353z"/></svg>
                      Ouvrir WhatsApp Chauffeur
                    </button>

                    <div className="p-3 bg-indigo-500/5 rounded-2xl border border-indigo-400/10 space-y-2">
                      <div className="flex gap-2 items-center text-xs text-indigo-400 font-bold">
                        <QrCode className="w-4 h-4" />
                        <span>Code de Livraison QR :</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        Donnez ce code ou présentez l'écran au livreur à son arrivée pour valider la réception du colis !
                      </p>
                      <div className="flex justify-center py-2">
                        <div className="p-3.5 bg-white rounded-2xl shadow-md border hover:border-slate-300 transition duration-300">
                          {/* Rich interactive generated QR code placeholder SVG representation */}
                          <svg width="100" height="100" viewBox="0 0 110 110" className="text-slate-900 mx-auto">
                            <rect width="110" height="110" fill="white" />
                            <g fill="currentColor">
                              {/* Position markers */}
                              <path d="M10,10 h25 v25 h-25 z M15,15 h15 v15 h-15 z" />
                              <path d="M75,10 h25 v25 h-25 z M80,15 h15 v15 h-15 z" />
                              <path d="M10,75 h25 v25 h-25 z M15,80 h15 v15 h-15 z" />
                              {/* Dense simulated patterns */}
                              <rect x="20" y="20" width="5" height="5" />
                              <rect x="85" y="20" width="5" height="5" />
                              <rect x="20" y="85" width="5" height="5" />
                              {/* Central pixels block cluster */}
                              <rect x="45" y="10" width="10" height="10" />
                              <rect x="60" y="20" width="5" height="5" />
                              <rect x="45" y="30" width="15" height="5" />
                              <rect x="10" y="45" width="10" height="10" />
                              <rect x="25" y="45" width="5" height="5" />
                              <rect x="40" y="45" width="20" height="15" />
                              <rect x="70" y="45" width="30" height="5" />
                              <rect x="15" y="60" width="15" height="5" />
                              <rect x="35" y="60" width="25" height="10" />
                              <rect x="75" y="60" width="15" height="5" />
                              <rect x="70" y="70" width="5" height="15" />
                              <rect x="45" y="75" width="15" height="20" />
                              <rect x="85" y="75" width="15" height="5" />
                              <rect x="80" y="85" width="20" height="15" />
                            </g>
                          </svg>
                        </div>
                      </div>
                      <p className="text-center font-mono font-bold text-xs text-indigo-400 select-all tracking-widest">{activeDelivery.qrCodeToken}</p>
                    </div>

                    <button
                      id="close-active-view-btn"
                      onClick={() => setActiveDelivery(null)}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs text-slate-400 font-bold transition"
                    >
                      Retourner au formulaire
                    </button>
                  </div>
                ) : (
                  /* DRIVER ACTIVE ROAD TRIGGER */
                  <div className="space-y-4 p-4 bg-slate-950 border border-slate-800 rounded-3xl">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
                      Contrôles Livreur
                    </h4>

                    {activeDelivery.status === 'pending' && (
                      <button
                        id="start-delivery-scooter-btn"
                        onClick={() => executeStatusUpdate('shipping')}
                        className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-lg"
                      >
                        <Play className="w-4 h-4 fill-slate-950 shrink-0" />
                        Démarrer la course en Scooter 🛵
                      </button>
                    )}

                    {activeDelivery.status === 'shipping' && (
                      <div className="space-y-3">
                        <div className="p-3 bg-amber-400/5 rounded-2xl border border-amber-400/20 text-xs text-amber-300">
                          <p className="font-bold">🛵 Course active en cours :</p>
                          <p className="mt-1 opacity-80 leading-relaxed">
                            {isRealGPSEnabled 
                              ? "Le tracker diffuse votre position GPS réelle à la seconde vers le téléphone du client."
                              : "Le tracker géolocalisé simule votre position. Les indications en Wolof guideront le client."}
                          </p>
                        </div>

                        {/* Interactive scan QR code and close */}
                        <button
                          id="scan-qr-complete-btn"
                          onClick={() => executeStatusUpdate('delivered')}
                          className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-lg"
                        >
                          <CheckCircle className="w-4 h-4 shrink-0" />
                          Scanner le QR Client & Clôturer
                        </button>
                      </div>
                    )}

                    {/* Launch native telephone Google Maps app */}
                    <div className="pt-3 border-t border-slate-900/80 space-y-2">
                      <p className="text-[10px] text-slate-500 uppercase font-mono font-bold">Applications & GPS Natifs du Téléphone</p>
                      
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${activeDelivery.latitude},${activeDelivery.longitude}&travelmode=driving`}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-md cursor-pointer text-center"
                        id="open-native-maps-app"
                        title="Ouvrir l'application Google Maps installée du téléphone"
                      >
                        <Compass className="w-4 h-4 text-white shrink-0" />
                        Navigation Google Maps Natif 🗺️
                      </a>

                      <button
                        type="button"
                        onClick={() => {
                          const val = !isRealGPSEnabled;
                          setIsRealGPSEnabled(val);
                          speakInstruction(
                            val 
                              ? "GPS natif du téléphone activé. Les coordonnées réelles du téléphone vont guider la livraison." 
                              : "GPS virtuel activé. La simulation automatique de course est relancée.",
                            val
                              ? "GPS réél bou téléphone bi dakh na. Sa khabar réél mo khamal yone wi."
                              : "Simulation bi déssat na.",
                            soundGuideLanguage
                          );
                        }}
                        className={`w-full py-3 border font-extrabold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 ${
                          isRealGPSEnabled
                            ? 'bg-amber-400 border-amber-400 text-slate-950 shadow-md shadow-amber-400/10'
                            : 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800'
                        }`}
                        id="toggle-real-gps-btn"
                        title="Utiliser la puce GPS de votre téléphone au lieu de la simulation"
                      >
                        <Navigation className={`w-4 h-4 ${isRealGPSEnabled ? 'animate-bounce text-slate-950' : 'text-amber-400'}`} />
                        {isRealGPSEnabled ? '📡 GPS Réel Actif (Puce)' : '📡 Activer le GPS Réel'}
                      </button>
                    </div>

                    {activeDelivery.status === 'delivered' && (
                      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-center text-emerald-400">
                        <p className="font-extrabold text-sm flex justify-center items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          LIVRAISON TERMINEE !
                        </p>
                        <p className="mt-1 opacity-80">
                          Merci ! Vous avez sécurisé le colis avec le protocole ALGS.
                        </p>
                        <button
                          id="clear-success-delivered-btn"
                          onClick={() => setActiveDelivery(null)}
                          className="mt-3.5 py-1.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[10px] font-bold rounded-xl transition uppercase"
                        >
                          Nouvelle course
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* No active delivery tracking selected */
              <div className="py-8 text-center space-y-3 p-4 bg-slate-950/40 rounded-3xl border border-dashed border-slate-800">
                <AlertCircle className="w-7 h-7 text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-slate-300">Aucune course active selectionnée</h4>
                <p className="text-xs text-slate-500 max-w-[240px] mx-auto leading-relaxed">
                  {activeRole === 'client' 
                    ? "Inscrivez-vous sur le formulaire d'envoi pour démarrer le suivi et le partage."
                    : "Sélectionnez un colis dans les 'Précédents' ou 'Courses' pour lancer le GPS et la simulation pour Dakar."}
                </p>
              </div>
            )}

            {/* In Driver Mode, listing all deliveries needing dispatch */}
            {activeRole === 'driver' && deliveries.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Courses Disponibles Dakar ({deliveries.filter(d => d.status !== 'delivered').length})
                </h4>
                
                <div className="grid grid-cols-1 gap-2.5">
                  {deliveries.filter(d => d.status !== 'delivered').map((dlv) => (
                    <button
                      id={`dlv-item-btn-${dlv.id}`}
                      key={dlv.id}
                      onClick={() => setActiveDelivery(dlv)}
                      className={`p-4 rounded-2xl border transition duration-200 text-left flex items-start justify-between cursor-pointer ${activeDelivery?.id === dlv.id ? 'bg-amber-400/10 border-amber-400' : 'bg-slate-950 hover:bg-slate-900 border-slate-850'}`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                          <h5 className="font-bold text-slate-200 text-sm">{dlv.clientName}</h5>
                        </div>
                        <p className="text-xs text-slate-400 font-mono font-medium truncate max-w-[160px]">
                          Quartier: {dlv.neighborhood}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="inline-block text-[9px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded uppercase font-bold">
                            STATUS: {dlv.status.toUpperCase()}
                          </span>
                          <span className="inline-block text-[9px] font-mono bg-slate-900 text-slate-400/80 px-1.5 py-0.5 rounded uppercase font-bold border border-slate-800">
                            {dlv.deliveryType === 'voiture' ? '🚗 voiture' : '🛵 moto'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-mono text-amber-400 font-bold block">
                          ETA {dlv.etaMinutes} MIN
                        </span>
                        <span className="inline-block mt-2 text-[10px] bg-slate-900 text-slate-400 p-1 rounded font-mono font-bold">
                          {dlv.id}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4.3 : HISTORY OF PREVIOUS DELIVERIES */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
                Historique des Courses
              </h4>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono font-bold">
                {deliveries.length} total
              </span>
            </div>

            {deliveries.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                Aucune livraison passée enregistrée dans la base SQLite locale. Les livraisons créées apparaîtront ici.
              </div>
            ) : (
              <div className="space-y-2">
                {deliveries.map((dlv) => (
                  <div
                    id={`history-card-${dlv.id}`}
                    key={dlv.id}
                    className="p-4 bg-slate-950 rounded-2xl border border-slate-850 hover:border-slate-800 transition flex items-start justify-between gap-3 relative overflow-hidden"
                  >
                    {/* Tiny visual success gradient overlay for delivered status */}
                    {dlv.status === 'delivered' && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                    )}

                    <div className="space-y-1 select-none flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-200 truncate">{dlv.clientName}</h4>
                        <span className={`text-[8px] px-1.5 py-0.2 rounded font-mono font-bold ${dlv.status === 'delivered' ? 'bg-emerald-500/15 text-emerald-400' : dlv.status === 'shipping' ? 'bg-amber-400/15 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                          {dlv.status.toUpperCase()}
                        </span>
                        <span className="text-[8px] px-1.5 py-0.2 bg-slate-900 border border-slate-850 text-slate-400 rounded font-mono font-bold select-none">
                          {dlv.deliveryType === 'voiture' ? '🚗 VOITURE' : '🛵 MOTO'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono truncate">
                        📍 {dlv.neighborhood}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {new Date(dlv.createdAt).toLocaleDateString()} - {dlv.paymentMethod.toUpperCase()}
                      </p>
                    </div>

                    <div className="flex flex-col items-end justify-between self-stretch shrink-0">
                      <button
                        id={`delete-dlv-btn-${dlv.id}`}
                        onClick={() => deleteDelivery(dlv.id)}
                        className="p-1 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition"
                        title="Supprimer l'historique"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        id={`track-dlv-btn-${dlv.id}`}
                        onClick={() => {
                          setActiveDelivery(dlv);
                          setActiveTab('tracking');
                        }}
                        className="mt-2.5 py-1 px-2.5 rounded bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[9px] text-white font-bold transition flex items-center gap-1 uppercase"
                      >
                        Suivre
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4.4 : SAMA IA WOLOF & FR DISCUSSION */}
        {activeTab === 'ai_assistant' && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-950/40 border border-emerald-800/30 rounded-3xl space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <Sparkles className="w-4.5 h-4.5" />
                <h4 className="text-xs font-extrabold uppercase tracking-wider">
                  Sama Assist (Assistant IA)
                </h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Explorateur et traducteur propulsé par Gemini 2.5 Flash. Taper une question sur un emplacement ou demandez à traduire des indications pour d'autres livreurs !
              </p>
            </div>

            {/* Simulated Chat Interface frame */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 min-h-[160px] flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] bg-slate-900 border border-slate-800 text-slate-400 w-max px-2 py-0.5 rounded font-mono font-bold uppercase">
                    Sama Assist replies:
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-900/50 p-3 rounded-xl border border-slate-900">
                    {chatResponse}
                  </p>
                </div>
                
                {isTyping && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>L'assistant réfléchit en Wolof...</span>
                  </div>
                )}
              </div>

              {/* Input Form */}
              <form onSubmit={submitChat} className="flex gap-2 mt-4 pt-4 border-t border-slate-900">
                <input
                  type="text"
                  required
                  placeholder="Posez une question à Sama IA..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  className="flex-1 py-2 px-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 outline-none focus:border-emerald-500 placeholder-slate-600 transition"
                />
                <button
                  id="submit-chat-btn"
                  type="submit"
                  disabled={isTyping}
                  className="p-2 bg-emerald-500 text-slate-950 rounded-xl hover:bg-emerald-400 transition hover:scale-[1.05] flex items-center justify-center shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            {/* Local quick prompt templates */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">
                Questions d'exemples suggestions :
              </p>
              <div className="flex flex-col gap-1">
                {[
                  "Précise l'itinéraire pour Almadies ?",
                  "Comment dit-on 'Dépêchez-vous s'il vous plaît' ?",
                  "Repères typiques de Yoff à côté du rivage ?"
                ].map((t, idx) => (
                  <button
                    id={`chat-template-btn-${idx}`}
                    key={idx}
                    type="button"
                    onClick={() => setChatMessage(t)}
                    className="text-left py-1.5 px-3 bg-slate-950 hover:bg-slate-900 rounded-xl text-[11px] text-slate-400 hover:text-white transition group flex items-center justify-between"
                  >
                    <span>{t}</span>
                    <span className="opacity-0 group-hover:opacity-100 transition text-emerald-400 font-bold font-mono">→</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Floating Scroll Nav Button: Monter/Descendre (Up/Down) */}
      <button
        id="scroll-to-edge-btn"
        onClick={handleToggleScroll}
        className="absolute bottom-6 right-6 z-40 px-3.5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black text-[11px] uppercase tracking-wider shadow-lg shadow-emerald-500/30 active:scale-95 transition flex items-center gap-1.5 duration-200 cursor-pointer"
        title={isAtTop ? "Défiler vers le bas" : "Défiler vers le haut"}
      >
        {isAtTop ? (
          <>
            <span>Descendre</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
          </>
        ) : (
          <>
            <span>En Haut</span>
            <ChevronUp className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
          </>
        )}
      </button>

      {/* Embedded MobileMoney popup modal overlay */}
      <MobileMoneyModal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        onSuccess={() => setIsPayModalOpen(false)}
      />
    </div>
  );
}

// Helpers micro-icons
function ShareIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-navigation"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>
  );
}
