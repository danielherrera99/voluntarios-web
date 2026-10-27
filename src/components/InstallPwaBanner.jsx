import { useState, useEffect } from 'react';
import { Smartphone, Download, Share, X, PlusSquare, CheckCircle, Sparkles } from 'lucide-react';

export default function InstallPwaBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installedSuccessfully, setInstalledSuccessfully] = useState(false);

  useEffect(() => {
    // 1. Detectar si ya está instalada y ejecutándose en modo app standalone
    const standaloneCheck = 
      window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone === true;

    setIsStandalone(standaloneCheck);
    if (standaloneCheck) return;

    // 2. Detectar si el dispositivo es iPhone / iPad (iOS)
    const userAgent = window.navigator.userAgent || '';
    const isIosDevice = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
    setIsIOS(isIosDevice);

    // 3. Capturar evento de instalación estándar en Android / Chrome / Edge
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Solo mostrar si no se ha descartado recientemente hoy
      const dismissed = localStorage.getItem('pwa_prompt_dismissed');
      if (!dismissed) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // En iOS, si no está instalada y no se ha descartado, mostrar el banner tras 3 segundos
    if (isIosDevice) {
      const dismissed = localStorage.getItem('pwa_prompt_dismissed');
      if (!dismissed) {
        const timer = setTimeout(() => {
          setShowBanner(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }

    // Escuchar cuando se haya completado la instalación
    const handleAppInstalled = () => {
      setInstalledSuccessfully(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIosInstructions(true);
      return;
    }

    if (!deferredPrompt) {
      // Si el navegador no disparó el evento antes pero es compatible
      alert('Para instalar la aplicación, abre el menú de opciones de tu navegador (los tres puntos arriba a la derecha) y selecciona "Instalar aplicación" o "Agregar a la pantalla principal".');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalledSuccessfully(true);
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    // Guardar para no volver a molestar por 24 horas
    localStorage.setItem('pwa_prompt_dismissed', Date.now().toString());
  };

  // Si ya corre como App nativa standalone, no mostrar nada
  if (isStandalone) return null;

  return (
    <>
      {/* BANNER FLOTANTE INFERIOR */}
      {showBanner && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 animate-bounce-subtle">
          <div className="bg-gradient-to-r from-diocesis-redDark to-diocesis-red text-white p-4 rounded-2xl shadow-2xl border-2 border-diocesis-mustard flex items-center justify-between gap-3">
            
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white p-1.5 shadow-md flex items-center justify-center shrink-0">
                <img 
                  src="/logos/logo_comision_juventud.png" 
                  alt="App Diocesana" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs sm:text-sm text-white truncate block">
                    Instalar App Oficial
                  </span>
                  <span className="bg-diocesis-mustard text-diocesis-redDark font-black text-[9px] px-1.5 py-0.2 rounded-full uppercase">
                    Móvil
                  </span>
                </div>
                <p className="text-[11px] text-stone-200 leading-tight mt-0.5">
                  {isIOS 
                    ? 'Agrégala a tu iPhone para usarla en pantalla completa' 
                    : 'Instálala en tu celular para tener acceso directo y rápido'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleInstallClick}
                className="px-3.5 py-2 bg-diocesis-mustard hover:bg-diocesis-mustardLight text-diocesis-redDark font-black text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                Instalar
              </button>

              <button
                onClick={handleDismiss}
                className="w-7 h-7 rounded-lg text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center transition"
                title="Cerrar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL CON INSTRUCCIONES PARA IPHONE / IPAD (iOS) */}
      {showIosInstructions && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white text-stone-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 animate-fade-in space-y-4">
            
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-diocesis-redDark text-diocesis-mustard flex items-center justify-center shadow-xs">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-title font-bold text-sm text-stone-900 leading-tight">
                    Instalar en tu iPhone
                  </h4>
                  <span className="text-[10px] text-stone-500 font-medium">Safari iOS</span>
                </div>
              </div>
              <button 
                onClick={() => setShowIosInstructions(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              En iPhone, Apple permite instalar la aplicación en 3 sencillos toques sin pasar por el App Store:
            </p>

            <div className="space-y-3 bg-stone-50 p-3.5 rounded-2xl border border-stone-200 text-xs text-stone-700">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-diocesis-redDark text-white flex items-center justify-center font-bold text-xs shrink-0">
                  1
                </div>
                <div>
                  Toca el botón <strong>Compartir</strong> en la barra inferior de Safari (ícono del cuadrado con la flecha <Share className="w-3.5 h-3.5 inline text-blue-600 mx-0.5" />).
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-diocesis-redDark text-white flex items-center justify-center font-bold text-xs shrink-0">
                  2
                </div>
                <div>
                  Desliza hacia abajo y presiona <strong className="text-stone-900">«Agregar a inicio»</strong> (<PlusSquare className="w-3.5 h-3.5 inline text-stone-700 mx-0.5" />).
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-diocesis-redDark text-white flex items-center justify-center font-bold text-xs shrink-0">
                  3
                </div>
                <div>
                  Presiona <strong>«Agregar»</strong> en la esquina superior derecha.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl font-medium">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>¡Listo! El ícono oficial aparecerá en la pantalla principal de tu iPhone como cualquier app.</span>
            </div>

            <button
              onClick={() => setShowIosInstructions(false)}
              className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold text-xs transition shadow-sm"
            >
              Entendido, voy a agregarlo
            </button>

          </div>
        </div>
      )}

      {/* NOTIFICACIÓN DE INSTALACIÓN EXITOSA */}
      {installedSuccessfully && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-700 text-white p-4 rounded-2xl shadow-xl flex items-center gap-3 animate-fade-in border border-emerald-500">
          <CheckCircle className="w-5 h-5 text-emerald-200" />
          <div className="text-xs font-bold">
            ¡Aplicación instalada con éxito! Ya puedes abrirla desde tu pantalla principal.
          </div>
          <button onClick={() => setInstalledSuccessfully(false)} className="text-white/70 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}
