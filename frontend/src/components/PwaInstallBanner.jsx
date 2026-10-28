import React, { useState, useEffect } from 'react';
import { Download, X, Share2, Smartphone, CheckCircle } from 'lucide-react';

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);

  useEffect(() => {
    // Verificar si ya está ejecutándose como PWA instalada
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Detectar iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = userAgent.includes('safari') && !userAgent.includes('chrome') && !userAgent.includes('crios') && !userAgent.includes('android');

    if (isIosDevice && isSafari && !isStandalone) {
      setIsIOS(true);
      const dismissed = sessionStorage.getItem('huasi_pwa_ios_dismissed');
      if (!dismissed) {
        setShowBanner(true);
      }
    }

    // Capturar evento de instalación nativa instantánea (Android, Chrome, Edge)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = sessionStorage.getItem('huasi_pwa_dismissed');
      if (!dismissed) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Escuchar cuando la app sea instalada exitosamente
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIosModal(true);
      return;
    }

    if (!deferredPrompt) {
      return;
    }

    try {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setShowBanner(false);
        setDeferredPrompt(null);
      }
    } catch (err) {
      console.warn('Error launching install prompt:', err);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    if (isIOS) {
      sessionStorage.setItem('huasi_pwa_ios_dismissed', '1');
    } else {
      sessionStorage.setItem('huasi_pwa_dismissed', '1');
    }
  };

  if (isInstalled || !showBanner) {
    return null;
  }

  return (
    <>
      {/* Banner flotante discreto de instalación rápida (ubicado a la izquierda para no chocar con PQR ni chat) */}
      <div className="fixed bottom-24 md:bottom-6 left-4 right-4 md:right-auto md:left-6 md:max-w-sm z-40 animate-fade-in">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3.5 rounded-2xl shadow-2xl border border-emerald-500/30 flex items-center justify-between gap-3 text-slate-800 dark:text-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-white p-1 shadow-md flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-800">
              <img src="/huasi-monograma.png" alt="HUASI" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-heading font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                  Instalar HUASI
                </span>
                <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  Gratis
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                Acceso directo rápido a tus alojamientos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleInstallClick}
              className="btn btn-primary btn-sm py-1.5 px-3 text-xs font-bold flex items-center gap-1.5 shadow-sm rounded-xl"
            >
              <Download size={14} />
              <span>Instalar</span>
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              title="Cerrar aviso"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Instructivo para iOS Safari */}
      {showIosModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-slide-up text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 mx-auto flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 border border-emerald-200 dark:border-emerald-800">
              <Smartphone size={32} />
            </div>
            
            <h3 className="font-heading font-extrabold text-lg text-slate-900 dark:text-white mb-2">
              Instalar en tu iPhone / iPad
            </h3>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Sigue estos 2 sencillos pasos en Safari para agregar HUASI a tu pantalla de inicio:
            </p>

            <div className="space-y-3 text-left bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 mb-6">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  1
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  Toca el botón <strong>Compartir</strong> <Share2 size={13} className="inline mx-1 text-blue-500" /> en la barra inferior de Safari.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  2
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  Baja y selecciona <strong>"Agregar al inicio"</strong> <span className="text-emerald-600 dark:text-emerald-400 font-bold">(+)</span>.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIosModal(false)}
              className="btn btn-primary w-full py-2.5 rounded-xl text-sm font-bold"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
