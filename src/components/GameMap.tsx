import React, { useState, useEffect, useRef } from 'react';
import { useDelivery, DAKAR_CENTER } from '../context/DeliveryContext';
import { 
  MapPin, 
  Navigation, 
  Compass, 
  Layers, 
  RotateCcw, 
  Locate, 
  ExternalLink, 
  Copy, 
  Check, 
  Smartphone, 
  Activity, 
  Sparkles,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { io } from 'socket.io-client';

// Constants for DAKAR sectors with correct GPS coordinates
const SENEGAL_NEIGHBORHOODS = [
  { name: "Almadies", lat: 14.7471, lng: -17.5147, desc: "Secteur Mamelles - Almadies" },
  { name: "Ngor", lat: 14.7431, lng: -17.5090, desc: "Plages de Ngor et environs" },
  { name: "Plateau", lat: 14.6672, lng: -17.4344, desc: "Dakar Centre-ville / Port" },
  { name: "Mermoz", lat: 14.7118, lng: -17.4735, desc: "Mermoz / Sacré-Cœur / VDN" },
  { name: "Ouakam", lat: 14.7225, lng: -17.4920, desc: "Monuments de la Renaissance" },
  { name: "Médina", lat: 14.6852, lng: -17.4478, desc: "Quartier historique de la Médina" },
  { name: "Yoff", lat: 14.7605, lng: -17.4738, desc: "Yoff Village / Dakar Ouest" },
  { name: "Parcelles", lat: 14.7554, lng: -17.4422, desc: "Parcelles Assainies" },
  { name: "Fann", lat: 14.6934, lng: -17.4665, desc: "Fann Résidence / Corniche" },
  { name: "Pikine", lat: 14.7578, lng: -17.3976, desc: "Banlieue Est Pikine" },
  { name: "Guédiawaye", lat: 14.7797, lng: -17.3934, desc: "Dakar Nord littoral" },
  { name: "Rufisque", lat: 14.7142, lng: -17.2721, desc: "Centre Est Rufisque" }
];

export default function GameMap() {
  const {
    activeDelivery,
    selectedLocation,
    setSelectedLocation,
    isLocating,
    setIsLocating,
    activeRole,
    updateDeliveryStatus,
    fetchDeliveries,
    isRealGPSEnabled,
    setIsRealGPSEnabled
  } = useDelivery();

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'visualizer' | 'neighborhoods'>('visualizer');
  
  // Real-time animated courier position
  const [scooterPos, setScooterPos] = useState<{ lat: number; lng: number } | null>(null);
  const [scooterAngle, setScooterAngle] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  
  // Keep track of animation request
  const simIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<any>(null);
  const [lastSocketUpdate, setLastSocketUpdate] = useState<number>(0);

  // Initialize Socket.io Client Connection
  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket.io Client] Connected.');
    });

    const handleStatusUpdated = (data: any) => {
      fetchDeliveries();
    };

    socket.on('delivery-status-updated', handleStatusUpdated);

    return () => {
      socket.off('delivery-status-updated', handleStatusUpdated);
      socket.disconnect();
    };
  }, []);

  // Join designated delivery room when active delivery selection changes
  useEffect(() => {
    const socket = socketRef.current;
    if (socket && activeDelivery) {
      socket.emit('join-delivery-room', activeDelivery.id);
    }
  }, [activeDelivery?.id]);

  // Bind real-time path handler for physical driver location broadcasts
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || activeRole !== 'client' || !activeDelivery) return;

    const handleLocationUpdated = (data: {
      latitude: number;
      longitude: number;
      bearing?: number;
      etaMinutes?: number;
    }) => {
      setScooterPos({ lat: data.latitude, lng: data.longitude });
      if (data.bearing !== undefined) setScooterAngle(data.bearing);
      setLastSocketUpdate(Date.now());
    };

    socket.on('location-updated', handleLocationUpdated);

    return () => {
      socket.off('location-updated', handleLocationUpdated);
    };
  }, [activeRole, activeDelivery?.id]);

  // Handle Geolocation API (Native GPS coordinates of the telephone)
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setSelectedLocation(coords);
        setIsLocating(false);
      },
      (err) => {
        console.error('Error locating:', err);
        setIsLocating(false);
        alert("Impossible de récupérer la position GPS de votre téléphone. Veuillez autoriser la localisation.");
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  // Simulating the scooter courier moving in real time OR utilizing native GPS
  useEffect(() => {
    const isClientTrackingActiveDriver = activeRole === 'client' && lastSocketUpdate > 0 && (Date.now() - lastSocketUpdate < 15000);

    if (activeDelivery && activeDelivery.status === 'shipping' && !isClientTrackingActiveDriver) {
      if (isRealGPSEnabled && activeRole === 'driver') {
        if (!navigator.geolocation) {
          alert("Le GPS natif n'est pas activé ou supporté.");
          setIsRealGPSEnabled(false);
          return;
        }

        console.log('[GPS Natif] Démarrage du tracking par puce GPS réelle...');
        const watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const curLat = pos.coords.latitude;
            const curLng = pos.coords.longitude;
            setScooterPos({ lat: curLat, lng: curLng });

            // Broadcast real-time driver coordinates to client
            if (socketRef.current) {
              socketRef.current.emit('driver-location-update', {
                deliveryId: activeDelivery.id,
                latitude: curLat,
                longitude: curLng,
                bearing: 0,
                etaMinutes: activeDelivery.etaMinutes
              });
            }
          },
          (err) => {
            console.error('[GPS Natif] Échec de la géolocalisation continue :', err);
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );

        return () => {
          navigator.geolocation.clearWatch(watchId);
        };
      } else {
        if (!isSimulating) {
          setIsSimulating(true);
          const startLat = activeDelivery.latitude + 0.012;
          const startLng = activeDelivery.longitude - 0.012;
          setScooterPos({ lat: startLat, lng: startLng });
          
          let progress = 0;
          const steps = 150;
          const intervalTime = 800;

          if (simIntervalRef.current) clearInterval(simIntervalRef.current);

          simIntervalRef.current = setInterval(() => {
            progress += 1;
            const ratio = progress / steps;

            if (ratio >= 1.0) {
              const finalPos = { lat: activeDelivery.latitude, lng: activeDelivery.longitude };
              setScooterPos(finalPos);
              setIsSimulating(false);
              if (simIntervalRef.current) clearInterval(simIntervalRef.current);
              
              if (activeRole === 'driver') {
                updateDeliveryStatus(activeDelivery.id, 'shipping', activeDelivery.paymentStatus, 0);
                
                if (socketRef.current) {
                  socketRef.current.emit('driver-location-update', {
                    deliveryId: activeDelivery.id,
                    latitude: activeDelivery.latitude,
                    longitude: activeDelivery.longitude,
                    bearing: scooterAngle,
                    etaMinutes: 0
                  });
                }
              }
            } else {
              const curLat = startLat + (activeDelivery.latitude - startLat) * ratio;
              const curLng = startLng + (activeDelivery.longitude - startLng) * ratio;
              
              const dLng = activeDelivery.longitude - startLng;
              const dLat = activeDelivery.latitude - startLat;
              const angle = (Math.atan2(dLng, dLat) * 180) / Math.PI;
              
              setScooterAngle(angle);
              setScooterPos({ lat: curLat, lng: curLng });

              const remainingEta = Math.max(1, Math.ceil(activeDelivery.etaMinutes * (1 - ratio)));
              
              if (activeRole === 'driver') {
                if (remainingEta !== activeDelivery.etaMinutes) {
                  updateDeliveryStatus(activeDelivery.id, 'shipping', activeDelivery.paymentStatus, remainingEta);
                }

                if (socketRef.current) {
                  socketRef.current.emit('driver-location-update', {
                    deliveryId: activeDelivery.id,
                    latitude: curLat,
                    longitude: curLng,
                    bearing: angle,
                    etaMinutes: remainingEta
                  });
                }
              }
            }
          }, intervalTime);
        }
      }
    } else {
      if (isClientTrackingActiveDriver) {
        if (simIntervalRef.current) {
          clearInterval(simIntervalRef.current);
          simIntervalRef.current = null;
        }
        setIsSimulating(false);
      } else {
        if (simIntervalRef.current) {
          clearInterval(simIntervalRef.current);
          simIntervalRef.current = null;
        }
        setScooterPos(null);
        setIsSimulating(false);
      }
    }

    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, [activeDelivery?.status, activeDelivery?.id, activeRole, lastSocketUpdate, isRealGPSEnabled]);

  const handleCopyCoords = () => {
    const lat = activeDelivery ? activeDelivery.latitude : selectedLocation.lat;
    const lng = activeDelivery ? activeDelivery.longitude : selectedLocation.lng;
    const n = activeDelivery ? activeDelivery.neighborhood : "Sénégal";
    const text = `Sama Position (Dakar) :\nQuartier: ${n}\nLatitude: ${lat}\nLongitude: ${lng}\nLien GPS: https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const currentLat = activeDelivery ? activeDelivery.latitude : selectedLocation.lat;
  const currentLng = activeDelivery ? activeDelivery.longitude : selectedLocation.lng;

  // URLs to trigger the Native Google Maps application inside any phone or device
  const nativeMapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${currentLat},${currentLng}&travelmode=driving`;
  const nativeMapsPinpointUrl = `https://www.google.com/maps/search/?api=1&query=${currentLat},${currentLng}`;

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl">
      {/* Background ambient animation */}
      <div className="absolute inset-0 z-0 bg-slate-950">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-emerald-500/5 rounded-full filter blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-[200px] h-[200px] bg-amber-500/5 rounded-full filter blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header controls inside the map card */}
      <div className="relative z-10 shrink-0 p-4 border-b border-slate-900 flex flex-wrap gap-2 justify-between items-center bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center text-slate-950 font-extrabold shadow-md">
            🇸🇳
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
              Tracker & GPS Natif
            </h3>
            <p className="text-sm font-black text-white">
              {activeDelivery ? `Livraison : ${activeDelivery.clientName}` : "Positionner mon repère d'adresse"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-slate-850">
          <button
            id="tab-visualizer"
            onClick={() => setActiveTab('visualizer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${activeTab === 'visualizer' ? 'bg-slate-850 text-emerald-400 border border-slate-800' : 'text-slate-400 hover:text-white'}`}
          >
            <Compass className="w-3.5 h-3.5" />
            Tracker Tactique
          </button>
          <button
            id="tab-neighborhoods"
            onClick={() => setActiveTab('neighborhoods')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${activeTab === 'neighborhoods' ? 'bg-slate-850 text-emerald-400 border border-slate-800' : 'text-slate-400 hover:text-white'}`}
          >
            <Layers className="w-3.5 h-3.5" />
            Secteurs Dakar
          </button>
        </div>
      </div>

      {/* MAIN TRACKER SURFACE */}
      <div className="relative z-10 flex-1 overflow-y-auto p-4 md:p-6 flex flex-col md:flex-row gap-6">
        <AnimatePresence mode="wait">
          {activeTab === 'visualizer' ? (
            <motion.div 
              key="visualizer-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col gap-6 justify-between"
            >
              {/* RADAR RETICLE DISPLAY */}
              <div className="flex-1 min-h-[180px] border border-slate-900 rounded-3xl bg-slate-950/40 relative flex items-center justify-center overflow-hidden">
                {/* Simulated radar sweep circular overlays */}
                <div className="absolute w-[280px] h-[280px] border border-emerald-500/10 rounded-full animate-pulse" />
                <div className="absolute w-[180px] h-[180px] border border-emerald-500/15 rounded-full" />
                <div className="absolute w-[80px] h-[80px] border border-emerald-500/25 rounded-full border-dashed" />
                <div className="absolute h-full w-[1px] bg-emerald-500/5" />
                <div className="absolute w-full h-[1px] bg-emerald-500/5" />

                {/* Sweeping radar ray effect */}
                <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-gradient-to-tr from-transparent to-emerald-500/5 origin-bottom-left -translate-y-full rounded-tr-full animate-[spin_6s_linear_infinite] pointer-events-none" />

                {/* Core position pointer */}
                <div className="relative flex flex-col items-center z-10">
                  <div className="absolute w-12 h-12 bg-emerald-500/35 rounded-full animate-ping -mt-1" />
                  <div className="w-10 h-10 rounded-full bg-slate-900 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-xl">
                    {scooterPos ? (
                      <Navigation className="w-5 h-5 animate-bounce fill-emerald-500/30 rotate-45" style={{ transform: `rotate(${scooterAngle}deg)` }} />
                    ) : (
                      <MapPin className="w-5 h-5 fill-emerald-500/20 text-emerald-400 animate-pulse" />
                    )}
                  </div>
                  <div className="mt-2.5 bg-slate-900 border border-slate-800 px-3 py-1 rounded-xl text-[10px] font-bold text-slate-300 font-mono tracking-wider text-center max-w-[180px]">
                    {activeDelivery ? (
                      <>
                        <span className="text-emerald-400 block uppercase font-extrabold mb-0.5">
                          {activeDelivery.deliveryType === 'voiture' ? 'Voiture Livraison 🚗' : 'Moto Livraison 🛵'}
                        </span>
                        {scooterPos ? `${scooterPos.lat.toFixed(5)}, ${scooterPos.lng.toFixed(5)}` : "En attente du livreur"}
                      </>
                    ) : (
                      <>
                        <span className="text-emerald-400 block uppercase font-extrabold mb-0.5">Point de Repère</span>
                        {currentLat.toFixed(5)}, {currentLng.toFixed(5)}
                      </>
                    )}
                  </div>
                </div>

                {/* Sub-indicator details */}
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-slate-900/80 border border-slate-850 px-2 py-1 rounded-lg text-[9px] font-mono text-slate-500">
                  <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
                  <span>GPS {isRealGPSEnabled ? "CHIP" : "VIRTUAL"}</span>
                </div>

                {/* Interactive Geolocation Trigger only for non-shipping deliveries */}
                {(!activeDelivery || activeDelivery.status !== 'shipping') && activeRole === 'client' && (
                  <button
                    id="map-embedded-locate-btn"
                    onClick={handleLocateMe}
                    disabled={isLocating}
                    className="absolute top-3 right-3 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition duration-200 shadow-lg cursor-pointer disabled:opacity-50"
                  >
                    <Locate className="w-3.5 h-3.5" />
                    {isLocating ? "Acquisition..." : "Mon GPS Réel"}
                  </button>
                )}
              </div>

              {/* DYNAMIC INFORMATION DETAILS & COORD FIELDS */}
              <div className="space-y-4">
                <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-850 flex flex-col xs:flex-row gap-4 justify-between items-start xs:items-center">
                  <div>
                    <h4 className="text-[10px] uppercase font-mono tracking-widest font-bold text-slate-400">Coordonnées Géographiques (WGS84)</h4>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div>
                        <span className="text-[10px] text-slate-500 font-mono">LAT:</span>
                        <span className="text-xs font-mono font-bold text-slate-200 ml-1 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-900">{currentLat.toFixed(6)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-mono">LNG:</span>
                        <span className="text-xs font-mono font-bold text-slate-200 ml-1 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-900">{currentLng.toFixed(6)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCopyCoords}
                      className="p-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-800 transition relative flex items-center justify-center cursor-pointer"
                      title="Copier les coordonnées absolues"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        window.open(nativeMapsPinpointUrl, '_blank');
                      }}
                      className="p-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-800 transition flex items-center justify-center cursor-pointer"
                      title="Voir sur Google Maps de mon téléphone"
                    >
                      <Share2 className="w-4 h-4 text-blue-400" />
                    </button>
                  </div>
                </div>

                {/* NO-API KEY MESSAGE OF COMFORT */}
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-start gap-3">
                  <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400 shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                    <strong className="text-emerald-400">Intégration Natif Zéro Clé :</strong> Cette application ne requiert aucun paiement de carte bancaire Google Maps. Elle synchronise vos réels capteurs GPS et exploite directement l'application <strong className="text-white">Google Maps installée dans votre téléphone</strong> pour calculer les itinéraires et assurer la navigation en temps réel.
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="neighborhoods-grid"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1"
            >
              <div className="mb-4 bg-slate-950 p-2.5 rounded-xl border border-slate-900">
                <p className="text-[11px] text-slate-400">
                  🇸🇳 <strong className="text-emerald-400">Sélectionnez votre quartier sénégalais</strong> ci-dessous pour pré-remplir instantanément les coordonnées de livraison appropriées et valider instantanément votre adresse.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {SENEGAL_NEIGHBORHOODS.map((sector) => {
                  const isSelected = Math.abs(currentLat - sector.lat) < 0.001 && Math.abs(currentLng - sector.lng) < 0.001;
                  return (
                    <button
                      key={sector.name}
                      type="button"
                      onClick={() => {
                        setSelectedLocation({ lat: sector.lat, lng: sector.lng });
                        setActiveTab('visualizer');
                      }}
                      className={`p-3.5 text-left rounded-2xl border transition duration-200 cursor-pointer flex flex-col justify-between ${
                        isSelected 
                          ? 'bg-emerald-500/10 border-emerald-500 text-white' 
                          : 'bg-slate-900 hover:bg-slate-850 border-slate-850/85 text-slate-300'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-extrabold tracking-wide uppercase font-mono text-white">{sector.name}</span>
                        {isSelected && <span className="text-[10px] text-emerald-400 font-extrabold">● Actif</span>}
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 lines-clamp-1 block leading-tight font-sans truncate">{sector.desc}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* NATIVE PHONE SYSTEM NAVIGATION CARD */}
        <div className="w-full md:w-[260px] flex-shrink-0 bg-slate-900 p-5 rounded-3xl border border-slate-850 flex-col justify-between space-y-5 md:flex hidden">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
              <h4 className="text-[11px] font-black text-slate-300 uppercase tracking-widest font-mono">
                Applis Mobiles
              </h4>
            </div>
            
            <p className="text-[11px] text-slate-400 leading-relaxed mb-4 font-sans">
              Utilisez la puissance du GPS natif installé sur cet appareil. Les boutons ci-dessous lanceront directement l'application Google Maps officielle de votre smartphone pour naviguer, guider, ou voir le trafic en temps réel à Dakar !
            </p>

            <div className="space-y-2.5">
              <a
                href={nativeMapsDirectionsUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-md cursor-pointer text-center"
                id="open-native-maps-directions"
              >
                <Compass className="w-4 h-4 text-white shrink-0" />
                Naviguer GPS Natif 🧭
              </a>

              <a
                href={nativeMapsPinpointUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="w-full py-3 bg-slate-850 hover:bg-slate-800 text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 border border-slate-750 cursor-pointer text-center"
                id="open-native-maps-pinpoint"
              >
                <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                Voir le Repère Google 📍
              </a>
            </div>
          </div>

          <div className="border-t border-slate-850 pt-4 flex flex-col">
            <span className="text-[10px] text-slate-500 font-mono">Dakar, Sénégal (Sama Position)</span>
            <span className="text-[10px] text-slate-600 font-mono mt-0.5">ALGS Delivery version 2.5</span>
          </div>
        </div>
      </div>
    </div>
  );
}
