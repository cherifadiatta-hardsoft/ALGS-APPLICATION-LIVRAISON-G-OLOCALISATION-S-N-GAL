import React, { useState } from 'react';
import { useDelivery } from '../context/DeliveryContext';
import { CreditCard, CheckCircle2, ShieldAlert, ArrowRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MobileMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MobileMoneyModal({ isOpen, onClose, onSuccess }: MobileMoneyModalProps) {
  const { activeDelivery, updateDeliveryStatus, speakInstruction } = useDelivery();
  const [paymentStep, setPaymentStep] = useState<'method' | 'processing' | 'success'>('method');
  const [selectedMethod, setSelectedMethod] = useState<'wave' | 'orange_money' | 'free_money'>('wave');
  const [phoneNumber, setPhoneNumber] = useState(activeDelivery?.clientPhone || '');
  const [authCode, setAuthCode] = useState('');
  const [isDailingCode, setIsDailingCode] = useState(false);
  const [simCode, setSimCode] = useState('');

  // Senegal phone number prefix formatting helper
  const cleanPhone = phoneNumber.replace(/\s+/g, '');

  const startPaymentProcess = () => {
    setPaymentStep('processing');
    if (selectedMethod === 'orange_money') {
      // Simulate dialing #144#39# to get OM code
      setIsDailingCode(true);
      setTimeout(() => {
        const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
        setSimCode(generatedCode);
        setIsDailingCode(false);
      }, 1500);
    } else {
      // Direct simulation for Wave
      setTimeout(() => {
        processPaymentSuccess();
      }, 3000);
    }
  };

  const verifyOrangeCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (authCode.trim() === simCode || authCode.trim() === '123456' || authCode.length >= 4) {
      setPaymentStep('processing');
      setTimeout(() => {
        processPaymentSuccess();
      }, 2000);
    } else {
      alert("Code d'autorisation non valide. Veuillez réessayer ou entrer '123456'.");
    }
  };

  const processPaymentSuccess = () => {
    if (activeDelivery) {
      updateDeliveryStatus(activeDelivery.id, activeDelivery.status, 'completed');
      speakInstruction(
        "Paiement Mobile Money validé avec succès ! Merci pour votre confiance.",
        "Paiement bi dial na ci jamm! Jërëjëf, sa ndokh sotti na.",
        'fr'
      );
    }
    setPaymentStep('success');
  };

  const handleFinish = () => {
    onSuccess();
    onClose();
  };

  if (!isOpen || !activeDelivery) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Background dimmer */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />

      <div className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100 max-w-md w-full relative z-10 transition-all">
        {/* Modal Dynamic Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            <span className="font-extrabold text-slate-800 tracking-tight text-lg">
              Portefeuille Mobile Money
            </span>
          </div>
          <button id="close-modal-btn" onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-sm">
            Fermer
          </button>
        </div>

        {/* 1. Payment Method Step */}
        {paymentStep === 'method' && (
          <div className="p-6 space-y-6">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                LIVRAISON RÉFÉRENCE : {activeDelivery.id}
              </p>
              <h3 className="text-xl font-black text-slate-800 mt-1">
                Sélectionnez votre moyen de paiement
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Montant total : <span className="font-bold text-slate-800">2 500 FCFA</span> (Livraison incluse).
              </p>
            </div>

            {/* Selection Options */}
            <div className="grid grid-cols-1 gap-3">
              {/* Wave */}
              <button
                id="select-wave-btn"
                onClick={() => setSelectedMethod('wave')}
                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition duration-200 text-left ${selectedMethod === 'wave' ? 'border-sky-400 bg-sky-502/10 ring-4 ring-sky-100/30' : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-sky-400 rounded-xl flex items-center justify-center text-white text-2xl font-black shadow-sm shrink-0">
                    🌊
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Wave Sénégal</h4>
                    <p className="text-xs text-sky-600 mt-0.5">Le pingouin bleu. Simple, rapide et sans frais.</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedMethod === 'wave' ? 'border-sky-500 bg-sky-500' : 'border-slate-300'}`}>
                  {selectedMethod === 'wave' && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                </div>
              </button>

              {/* Orange Money */}
              <button
                id="select-om-btn"
                onClick={() => setSelectedMethod('orange_money')}
                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition duration-200 text-left ${selectedMethod === 'orange_money' ? 'border-orange-400 bg-orange-52/15 ring-4 ring-orange-100/30' : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-white text-2xl font-black shadow-sm shrink-0">
                    🍊
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Orange Money</h4>
                    <p className="text-xs text-orange-600 mt-0.5">Dial #144#39# pour obtenir votre code.</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedMethod === 'orange_money' ? 'border-orange-500 bg-orange-500' : 'border-slate-300'}`}>
                  {selectedMethod === 'orange_money' && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                </div>
              </button>

              {/* Free Money */}
              <button
                id="select-free-btn"
                onClick={() => setSelectedMethod('free_money')}
                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition duration-200 text-left ${selectedMethod === 'free_money' ? 'border-red-400 bg-red-52/15 ring-4 ring-red-100/30' : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center text-white text-2xl font-black shadow-sm shrink-0">
                    🔴
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Free Money</h4>
                    <p className="text-xs text-red-600 mt-0.5">Paiement sécurisé par code d'authentification.</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedMethod === 'free_money' ? 'border-red-500 bg-red-500' : 'border-slate-300'}`}>
                  {selectedMethod === 'free_money' && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                </div>
              </button>
            </div>

            {/* Input mobile info */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest font-mono">
                Numéro de Téléphone Client
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="77 123 45 67"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition"
              />
            </div>

            <button
              id="confirm-pay-type-btn"
              onClick={startPaymentProcess}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-2xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition duration-200"
            >
              Initier le Paiement (2 500 FCFA)
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 2. Processing / Orange Money Auth Entry */}
        {paymentStep === 'processing' && (
          <div className="p-6 text-center space-y-6">
            {selectedMethod === 'orange_money' && simCode ? (
              <form onSubmit={verifyOrangeCode} className="space-y-6">
                <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl text-left">
                  <div className="flex gap-2 items-center text-orange-600 font-bold text-sm">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Dial #144#39# Simulation de l'USSD :</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    ALGS a détecté votre Orange Money ! Sur votre vrai mobile Dakarois, vous taperiez le code USSD pour obtenir le code d'autorisation temporaire de session.
                  </p>
                  <p className="text-xs font-mono text-orange-800 bg-orange-100/50 font-black p-2 rounded-xl mt-3 text-center border border-orange-200">
                    CODE GÉNÉRÉ POUR LE TEST : {simCode}
                  </p>
                </div>

                <div className="space-y-2 text-left">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Séquence / Code d'Autorisation (6 chiffres)
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={authCode}
                    onChange={(e) => setAuthCode(e.target.value)}
                    placeholder="Entrez le code..."
                    className="w-full text-center tracking-widest px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <button
                  id="verify-code-btn"
                  type="submit"
                  className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-2xl shadow-lg shadow-orange-500/10 transition"
                >
                  Valider la transaction Orange Money
                </button>
              </form>
            ) : (
              <div className="py-8 space-y-4">
                <div className="flex justify-center">
                  {selectedMethod === 'wave' ? (
                    <div className="relative">
                      <div className="absolute inset-0 bg-sky-200/50 rounded-full animate-ping" />
                      <div className="w-20 h-20 bg-sky-400 rounded-3xl flex items-center justify-center text-4xl shadow-xl border border-white z-10 relative">
                        🌊
                      </div>
                    </div>
                  ) : (
                    <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
                  )}
                </div>

                <div>
                  <h4 className="text-lg font-bold text-slate-800 mt-4">
                    {selectedMethod === 'wave' 
                      ? "Envoi de la notification Wave..."
                      : "Liaison au serveur bancaire..."}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1.5 max-w-xs mx-auto">
                    {selectedMethod === 'wave'
                      ? "Ouvrez votre application Wave sur votre téléphone Dakar pour valider la transaction de 2 500 FCFA."
                      : "Simulation en cours pour valider votre virement local..."}
                  </p>
                </div>

                {selectedMethod === 'wave' && (
                  <div className="max-w-xs mx-auto p-4 bg-sky-50 rounded-2xl border border-sky-100 text-sky-950 text-xs">
                    <p className="font-bold">📱 Mode Simulation Actif :</p>
                    <p className="mt-1 opacity-80">La notification va se valider automatiquement dans 3 secondes.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 3. Success Step */}
        {paymentStep === 'success' && (
          <div className="p-6 text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-emerald-100 border border-emerald-200 rounded-full flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-10 h-10" />
              </div>
            </div>

            <div>
              <h4 className="text-xl font-black text-slate-800">
                Alhamdoulillah ! Paiement Reçu
              </h4>
              <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto">
                La somme de 2 500 FCFA a été prélevée de votre compte {selectedMethod === 'wave' ? 'Wave' : selectedMethod === 'orange_money' ? 'Orange Money' : 'Free Money'} pour le colis de {activeDelivery.clientName}.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left font-mono text-[11px] text-slate-600 space-y-1">
              <p><span className="font-bold text-slate-800">Facture :</span> {activeDelivery.id}</p>
              <p><span className="font-bold text-slate-800">Opérateur :</span> {selectedMethod.toUpperCase()}</p>
              <p><span className="font-bold text-slate-800">Statut :</span> PAYÉ AVEC SUCCÈS</p>
              <p><span className="font-bold text-slate-800">Heure :</span> {new Date().toLocaleTimeString()}</p>
            </div>

            <button
              id="payment-done-btn"
              onClick={handleFinish}
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-2xl shadow-lg transition"
            >
              Terminer & fermer la facture
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
