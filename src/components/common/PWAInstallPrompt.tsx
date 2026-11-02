import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share2, Check } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    // Check if already running as installed standalone app
    const isRunningStandalone = window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;
    setIsStandalone(isRunningStandalone);

    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Capture standard PWA install prompt event on Chrome, Edge, Android
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      setInstalledSuccess(true);
      setTimeout(() => setInstalledSuccess(false), 5000);
    };

    const handleOpenTrigger = () => {
      setDismissed(false);
      if (deferredPrompt) {
        deferredPrompt.prompt();
      } else if (isIosDevice) {
        setShowIOSGuide(true);
      } else {
        alert('To install Masala Factory on this device, click the "Install" or "Add to Home screen" icon in your browser address bar or menu.');
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('open-pwa-install', handleOpenTrigger);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('open-pwa-install', handleOpenTrigger);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
        setInstalledSuccess(true);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  // If already installed in standalone mode or dismissed, don't show prompt
  if (isStandalone || dismissed) {
    return null;
  }

  // Only show if browser supports install or is iOS
  if (!deferredPrompt && !isIOS) {
    return null;
  }

  return (
    <>
      {/* Sleek Floating Install Banner */}
      <aside 
        aria-label="Install Masala Factory App"
        className="fixed bottom-20 sm:bottom-4 left-3 right-3 sm:left-auto sm:right-4 z-40 max-w-md p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl border border-emerald-500/40 backdrop-blur-md animate-in slide-in-from-bottom-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
            <Smartphone className="w-5 h-5 animate-pulse" />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 truncate">
              <span>Install Masala Factory App</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-normal">
                PWA
              </span>
            </h4>
            <p className="text-[11px] text-slate-300 mt-0.5 truncate">
              {isIOS ? 'Install on Home Screen for native app speed' : 'Add to home screen to use like a mobile app'}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 flex items-center gap-1 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* iOS Instructions Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="w-full max-w-sm p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Share2 className="w-4 h-4 text-emerald-600" />
                Install on iPhone / iPad
              </h3>
              <button 
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-2 list-decimal list-inside">
              <li>Open this site in <strong className="text-slate-900 dark:text-white">Safari</strong>.</li>
              <li>Tap the <strong className="text-slate-900 dark:text-white">Share</strong> button (⎙ or box with arrow) at the bottom.</li>
              <li>Scroll down and tap <strong className="text-emerald-600 dark:text-emerald-400">"Add to Home Screen"</strong>.</li>
              <li>Tap <strong className="text-slate-900 dark:text-white">"Add"</strong> in the top right corner.</li>
            </ol>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {installedSuccess && (
        <aside 
          aria-label="App installed confirmation"
          className="fixed top-4 right-4 z-50 p-3 rounded-xl bg-emerald-600 text-white text-xs font-semibold shadow-xl flex items-center gap-2 animate-in fade-in"
        >
          <Check className="w-4 h-4" />
          <span>App installed successfully! Look for it on your home screen.</span>
        </aside>
      )}
    </>
  );
};
