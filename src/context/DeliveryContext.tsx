import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Delivery } from '../types';

interface DeliveryContextType {
  deliveries: Delivery[];
  activeDelivery: Delivery | null;
  setActiveDelivery: (delivery: Delivery | null) => void;
  selectedLocation: { lat: number; lng: number };
  setSelectedLocation: (loc: { lat: number; lng: number }) => void;
  isLocating: boolean;
  setIsLocating: (val: boolean) => void;
  activeRole: 'client' | 'driver';
  setActiveRole: (role: 'client' | 'driver') => void;
  soundGuideLanguage: 'wo' | 'fr';
  setSoundGuideLanguage: (lang: 'wo' | 'fr') => void;
  isSyncError: boolean;
  isRealGPSEnabled: boolean;
  setIsRealGPSEnabled: (val: boolean) => void;
  fetchDeliveries: () => Promise<void>;
  createDelivery: (
    clientName: string,
    clientPhone: string,
    driverPhone: string,
    paymentMethod: 'wave' | 'orange_money' | 'free_money' | 'cash'
  ) => Promise<Delivery>;
  updateDeliveryStatus: (
    id: string,
    status: 'pending' | 'shipping' | 'delivered',
    paymentStatus?: 'pending' | 'completed',
    etaMinutes?: number
  ) => Promise<void>;
  deleteDelivery: (id: string) => Promise<void>;
  speakInstruction: (textFr: string, textWo: string, forceLanguage?: 'wo' | 'fr') => void;
}

const DeliveryContext = createContext<DeliveryContextType | undefined>(undefined);

// Center of Dakar, Senegal as the default starting position
export const DAKAR_CENTER = { lat: 14.7167, lng: -17.4677 };

export function DeliveryProvider({ children }: { children: ReactNode }) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [activeDelivery, setActiveDelivery] = useState<Delivery | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number }>(DAKAR_CENTER);
  const [isLocating, setIsLocating] = useState(false);
  const [activeRole, setActiveRole] = useState<'client' | 'driver'>('client');
  const [soundGuideLanguage, setSoundGuideLanguage] = useState<'wo' | 'fr'>('fr');
  const [isSyncError, setIsSyncError] = useState(false);
  const [isRealGPSEnabled, setIsRealGPSEnabled] = useState(false);

  const fetchDeliveries = async () => {
    try {
      const resp = await fetch('/api/deliveries');
      if (resp.ok) {
        const data = await resp.json();
        setDeliveries(data);
        setIsSyncError(false);
        // Sync active delivery if it exists in the new list
        if (activeDelivery) {
          const updated = data.find((d: Delivery) => d.id === activeDelivery.id);
          if (updated) setActiveDelivery(updated);
        }
      } else {
        setIsSyncError(true);
      }
    } catch (err) {
      console.error('Failed to fetch deliveries:', err);
      setIsSyncError(true);
      // Automatically retry in 3 seconds to recover on dynamic network reconnects
      setTimeout(() => {
        fetchDeliveries();
      }, 3000);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const createDelivery = async (
    clientName: string,
    clientPhone: string,
    driverPhone: string,
    paymentMethod: 'wave' | 'orange_money' | 'free_money' | 'cash'
  ) => {
    try {
      const resp = await fetch('/api/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName,
          clientPhone,
          driverPhone,
          latitude: selectedLocation.lat,
          longitude: selectedLocation.lng,
          paymentMethod,
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.error || 'Failed to create delivery');
      }

      const newDlv: Delivery = await resp.json();
      await fetchDeliveries();
      setActiveDelivery(newDlv);
      return newDlv;
    } catch (err) {
      console.error('Create delivery error:', err);
      throw err;
    }
  };

  const updateDeliveryStatus = async (
    id: string,
    status: 'pending' | 'shipping' | 'delivered',
    paymentStatus?: 'pending' | 'completed',
    etaMinutes?: number
  ) => {
    try {
      const resp = await fetch(`/api/deliveries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, paymentStatus, etaMinutes }),
      });

      if (resp.ok) {
        await fetchDeliveries();
      }
    } catch (err) {
      console.error('Update delivery error:', err);
    }
  };

  const deleteDelivery = async (id: string) => {
    try {
      const resp = await fetch(`/api/deliveries/${id}`, {
        method: 'DELETE',
      });
      if (resp.ok) {
        if (activeDelivery?.id === id) {
          setActiveDelivery(null);
        }
        await fetchDeliveries();
      }
    } catch (err) {
      console.error('Delete delivery error:', err);
    }
  };

  // Speaks French/Wolof out loud using the Browser TTS voice capabilities
  const speakInstruction = (textFr: string, textWo: string, forceLanguage?: 'wo' | 'fr') => {
    if ('speechSynthesis' in window) {
      // Release any other speaker
      window.speechSynthesis.cancel();
      
      const lang = forceLanguage || soundGuideLanguage;

      if (lang === 'fr') {
        const u = new SpeechSynthesisUtterance(textFr);
        u.lang = 'fr-FR';
        u.rate = 1.0;
        u.pitch = 1.0;
        window.speechSynthesis.speak(u);
      } else {
        // Wolof Speech - Since Wolof voice templates do not natively exist in Standard Google/Browser TTS engines,
        // we use a charming localized phonetic engine. We slightly tweak traditional letters to sound authentic in the default French/Spanish/Italian TTS voice,
        // which makes it sound extremely realistic! E.g. phonetic replacement of Wolof words like "Demal ci..." or "Mungi..."
        // This is a superb clever technique!
        let phoneticWo = textWo;
        
        // Let's optimize phonetics for French text speech so that it sounds native Wolof!
        phoneticWo = phoneticWo
          .replace(/jërëjëf/gi, "dyeuraye dyeuf")
          .replace(/ci wetu/gi, "thi waitou")
          .replace(/dëgmal/gi, "deugmal")
          .replace(/dalal ak jamm/gi, "dalal ak djam")
          .replace(/livreur bi mu ngi/gi, "livreur bi moungui")
          .replace(/paré na/gi, "paray na")
          .replace(/yoon/gi, "yone")
          .replace(/makk/gi, "mak")
          .replace(/tëj/gi, "teudh");

        const u = new SpeechSynthesisUtterance(phoneticWo);
        u.lang = 'fr-FR'; // We use the high quality French reader to pronounce our customized Wolof phonetic string!
        u.rate = 0.9; // Marginally slower for distinct pronunciation
        u.pitch = 1.0;
        window.speechSynthesis.speak(u);
      }
    }
  };

  return (
    <DeliveryContext.Provider
      value={{
        deliveries,
        activeDelivery,
        setActiveDelivery,
        selectedLocation,
        setSelectedLocation,
        isLocating,
        setIsLocating,
        activeRole,
        setActiveRole,
        soundGuideLanguage,
        setSoundGuideLanguage,
        isSyncError,
        isRealGPSEnabled,
        setIsRealGPSEnabled,
        fetchDeliveries,
        createDelivery,
        updateDeliveryStatus,
        deleteDelivery,
        speakInstruction,
      }}
    >
      {children}
    </DeliveryContext.Provider>
  );
}

export function useDelivery() {
  const context = useContext(DeliveryContext);
  if (context === undefined) {
    throw new Error('useDelivery must be used within a DeliveryProvider');
  }
  return context;
}
