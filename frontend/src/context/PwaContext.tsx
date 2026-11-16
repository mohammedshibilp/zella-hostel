import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PwaContextType {
  isOnline: boolean;
  isInstallable: boolean;
  isInstalled: boolean;
  isIos: boolean;
  isSafari: boolean;
  hasUpdate: boolean;
  isIosModalOpen: boolean;
  setIsIosModalOpen: (open: boolean) => void;
  installApp: () => Promise<boolean>;
  updateApp: () => void;
  dismissUpdate: () => void;
  checkForUpdates: () => Promise<void>;
}

const PwaContext = createContext<PwaContextType | undefined>(undefined);

export const PwaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [hasUpdate, setHasUpdate] = useState<boolean>(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [isIosModalOpen, setIsIosModalOpen] = useState<boolean>(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Platform and browser detection
  const isIos =
    typeof window !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  const isSafari =
    typeof window !== 'undefined' &&
    /Safari/.test(navigator.userAgent) &&
    !/Chrome|CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);

  // Check standalone mode (already installed & launched as PWA)
  const checkIsInstalled = useCallback(() => {
    if (typeof window === 'undefined') return false;

    const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
    const isStandaloneNavigator = (window.navigator as any).standalone === true;
    const isAndroidApp = document.referrer.includes('android-app://');

    return isStandaloneMedia || isStandaloneNavigator || isAndroidApp;
  }, []);

  // Online / Offline synchronization listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check display-mode & install events
  useEffect(() => {
    const installed = checkIsInstalled();
    setIsInstalled(installed);

    // If already installed, app cannot be installed again
    if (installed) {
      setIsInstallable(false);
      return;
    }

    // On iOS Safari, manual install is always available if not yet standalone
    if (isIos && !installed) {
      setIsInstallable(true);
    }

    // Capture standard PWA installation prompt (Chromium, Edge, Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      setIsIosModalOpen(false);
      console.log('[PWA] Zellahostel installed successfully');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [checkIsInstalled, isIos]);

  // Register Service Worker and monitor updates
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    let isRefreshing = false;

    // Reload page once new service worker takes control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!isRefreshing) {
        isRefreshing = true;
        window.location.reload();
      }
    });

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        setSwRegistration(registration);
        console.log('[PWA] Service Worker registered with scope:', registration.scope);

        // Check if an update is already waiting
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setHasUpdate(true);
        }

        // Listen for new updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(newWorker);
              setHasUpdate(true);
              console.log('[PWA] New version ready for activation');
            }
          });
        });

        // Periodic update check every 30 minutes
        const updateInterval = setInterval(() => {
          registration.update().catch((err) => {
            console.debug('[PWA] Periodic update check skipped:', err);
          });
        }, 1000 * 60 * 30);

        return () => clearInterval(updateInterval);
      })
      .catch((error) => {
        console.warn('[PWA] Service Worker registration failed:', error);
      });
  }, []);

  // Trigger installation
  const installApp = async (): Promise<boolean> => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setIsInstallable(false);
          setDeferredPrompt(null);
          return true;
        }
      } catch (err) {
        console.error('[PWA] Install prompt failed', err);
      }
      return false;
    }

    // On iOS Safari, show step-by-step installation instructions
    if (isIos) {
      setIsIosModalOpen(true);
      return false;
    }

    return false;
  };

  // Activate pending update
  const updateApp = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else if (swRegistration?.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  };

  const dismissUpdate = () => {
    setHasUpdate(false);
  };

  const checkForUpdates = async () => {
    if (swRegistration) {
      try {
        await swRegistration.update();
      } catch (err) {
        console.debug('[PWA] Update check failed:', err);
      }
    }
  };

  return (
    <PwaContext.Provider
      value={{
        isOnline,
        isInstallable,
        isInstalled,
        isIos,
        isSafari,
        hasUpdate,
        isIosModalOpen,
        setIsIosModalOpen,
        installApp,
        updateApp,
        dismissUpdate,
        checkForUpdates,
      }}
    >
      {children}
    </PwaContext.Provider>
  );
};

export const usePwa = (): PwaContextType => {
  const context = useContext(PwaContext);
  if (!context) {
    throw new Error('usePwa must be used within a PwaProvider');
  }
  return context;
};
