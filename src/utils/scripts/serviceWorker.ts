// Service Worker registration et gestion pour ANTL PWA

const SW_URL = '/sw.js';
const isProduction = (() => {
  try {
    return import.meta.env?.PROD || false;
  } catch {
    // Fallback: considérer comme production si on ne peut pas détecter
    return true;
  }
})();

// Flags pour éviter les notifications multiples
let hasShownUpdateNotification = false;
let updateCheckInterval: number | null = null;
let lastUpdateTime = 0; // Timestamp de la dernière mise à jour installée
const UPDATE_GRACE_PERIOD = 60000; // 60 secondes de grace après une mise à jour

// Types pour les messages du Service Worker
interface ServiceWorkerMessage {
  type: 'SKIP_WAITING' | 'GET_VERSION' | 'CLEAR_CACHE';
  payload?: unknown;
}

interface ServiceWorkerResponse {
  version?: string;
  buildVersion?: string;
  timestamp?: number;
  success?: boolean;
}

// Vérifier si les Service Workers sont supportés
export const isServiceWorkerSupported = (): boolean => {
  return 'serviceWorker' in navigator;
};

// Vérifier si l'app peut être installée (PWA)
export const isPWAInstallable = (): boolean => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

// Enregistrer le Service Worker
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!isServiceWorkerSupported()) {
    console.warn('[PWA] Service Workers not supported');
    return null;
  }

  try {
    console.log('[PWA] Registering service worker...');
    const registration = await navigator.serviceWorker.register(SW_URL, { updateViaCache: 'none' });
    registration.update().catch(() => undefined);

    console.log('[PWA] Service worker registered successfully');

    // Écouter les mises à jour du Service Worker
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      console.log('[PWA] New service worker found...');

      // Écouter l'état du nouveau worker
      newWorker.addEventListener('statechange', () => {
        // Quand le nouveau worker est installé et qu'il y a un worker actif (mise à jour disponible)
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('[PWA] Service worker update detected');

          // Vérifier si on est dans la période de grace après une mise à jour
          const timeSinceLastUpdate = Date.now() - lastUpdateTime;
          if (timeSinceLastUpdate < UPDATE_GRACE_PERIOD) {
            console.log('[PWA] Within grace period, skipping notification');
            return;
          }

          //Notifier seulement si pas déjà notifié
          if (!hasShownUpdateNotification) {
            console.log('[PWA] Showing update notification');
            hasShownUpdateNotification = true;
            showUpdateAvailableNotification();
          }
        } else if (newWorker.state === 'activated') {
          // Le nouveau worker est activé après skipWaiting
          console.log('[PWA] Service worker activated');
          lastUpdateTime = Date.now(); // Enregistrer le timestamp de la mise à jour
        }
      });
    });

    return registration;
  } catch (error) {
    console.error('[PWA] Service worker registration failed:', error);
    return null;
  }
};

// Désenregistrer le Service Worker
export const unregisterServiceWorker = async (): Promise<boolean> => {
  if (!isServiceWorkerSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const unregistered = await registration.unregister();
      console.log('[PWA] Service worker unregistered:', unregistered);
      return unregistered;
    }
    return true;
  } catch (error) {
    console.error('[PWA] Service worker unregistration failed:', error);
    return false;
  }
};

export const cleanupDevelopmentPWA = async (): Promise<void> => {
  if (isProduction) return;

  if (isServiceWorkerSupported()) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
  }

  console.log('[PWA] Development service workers and caches cleared');
};

// Envoyer un message au Service Worker
export const sendMessageToServiceWorker = async (
  message: ServiceWorkerMessage
): Promise<ServiceWorkerResponse | null> => {
  if (!navigator.serviceWorker.controller) {
    console.warn('[PWA] No active service worker to send message to');
    return null;
  }

  return new Promise((resolve) => {
    const messageChannel = new MessageChannel();
    
    messageChannel.port1.onmessage = (event) => {
      resolve(event.data);
    };

    const controller = navigator.serviceWorker.controller;
    if (controller) {
      controller.postMessage(message, [messageChannel.port2]);
    }
    
    // Timeout après 5 secondes
    setTimeout(() => resolve(null), 5000);
  });
};

// Forcer l'activation d'un nouveau Service Worker
export const skipWaiting = async (): Promise<void> => {
  // Enregistrer le timestamp avant de recharger
  lastUpdateTime = Date.now();
  // Reset le flag après installation
  hasShownUpdateNotification = false;

  await sendMessageToServiceWorker({ type: 'SKIP_WAITING' });
  window.location.reload();
};

// Vider le cache
export const clearCache = async (): Promise<boolean> => {
  const response = await sendMessageToServiceWorker({ type: 'CLEAR_CACHE' });
  return response?.success || false;
};

// Obtenir la version du Service Worker
export const getServiceWorkerVersion = async (): Promise<string | null> => {
  const response = await sendMessageToServiceWorker({ type: 'GET_VERSION' });
  return response?.version || null;
};

// Obtenir les informations détaillées de version
export const getVersionInfo = async (): Promise<{
  version: string | null;
  buildVersion: string | null;
  timestamp: number | null;
} | null> => {
  const response = await sendMessageToServiceWorker({ type: 'GET_VERSION' });
  if (response) {
    return {
      version: response.version || null,
      buildVersion: response.buildVersion || null,
      timestamp: response.timestamp || null
    };
  }
  return null;
};

// Vérifier si une nouvelle version est disponible
export const checkForNewVersion = async (): Promise<boolean> => {
  if (!isServiceWorkerSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      // Forcer la vérification des mises à jour
      await registration.update();
      
      // Vérifier s'il y a un nouveau worker en attente
      return !!registration.waiting || !!registration.installing;
    }
  } catch (error) {
    console.error('[SW] Failed to check for updates:', error);
  }
  
  return false;
};

// Vérifier l'état de la connexion
export const checkOnlineStatus = (): boolean => {
  return navigator.onLine;
};

// Écouter les changements de connexion
export const addConnectionListeners = (
  onOnline: () => void,
  onOffline: () => void
): (() => void) => {
  const handleOnline = () => {
    console.log('[PWA] Connection restored');
    onOnline();
  };

  const handleOffline = () => {
    console.log('[PWA] Connection lost');
    onOffline();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Retourner une fonction de nettoyage
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};

// Notification de mise à jour disponible
const showUpdateAvailableNotification = async (): Promise<void> => {
  // Import dynamique pour éviter les problèmes de bundle
  const { showPWAUpdatePrompt } = await import('../services/alertService');

  const shouldUpdate = await showPWAUpdatePrompt({
    title: 'Mise à jour disponible',
    message: 'Une nouvelle version de l\'application est disponible.\n\nVoulez-vous l\'installer maintenant pour bénéficier des dernières améliorations ?',
    confirmText: 'Installer',
    cancelText: 'Plus tard'
  });

  if (shouldUpdate) {
    skipWaiting();
  } else {
    // L'utilisateur a reporté - ne PAS reset le flag immédiatement
    // Le flag sera reset après la période de grace ou au prochain vrai cycle
    console.log('[PWA] Update postponed by user');
  }
};

// Vérification automatique périodique des mises à jour
export const startUpdateChecker = (): (() => void) => {
  const checkInterval = 5 * 60 * 1000; // 5 minutes

  // Nettoyer l'intervalle précédent s'il existe
  if (updateCheckInterval !== null) {
    clearInterval(updateCheckInterval);
  }

  updateCheckInterval = window.setInterval(async () => {
    const hasUpdate = await checkForNewVersion();
    if (hasUpdate && !hasShownUpdateNotification) {
      hasShownUpdateNotification = true;
      await showUpdateAvailableNotification();
    }
  }, checkInterval);

  // Retourner une fonction pour nettoyer l'interval
  return () => {
    if (updateCheckInterval !== null) {
      clearInterval(updateCheckInterval);
      updateCheckInterval = null;
    }
  };
};

// Vérifier si l'app est installée (PWA)
export const isPWAInstalled = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.matchMedia('(display-mode: fullscreen)').matches ||
         // @ts-expect-error - standalone est spécifique à Safari
         (window.navigator as Record<string, unknown>).standalone === true;
};

// Prompt d'installation PWA
export const showInstallPrompt = (): Promise<boolean> => {
  return new Promise((resolve) => {
    let deferredPrompt: { prompt: () => void; userChoice: Promise<{ outcome: string }> } | null = null;

    // Écouter l'événement beforeinstallprompt
    const handleBeforeInstallPrompt = async (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as unknown as typeof deferredPrompt;
      
      // Import dynamique pour éviter les problèmes de bundle
      const { showPWAUpdatePrompt } = await import('../services/alertService');
      
      // Montrer un bouton d'installation personnalisé
      const shouldInstall = await showPWAUpdatePrompt({
        title: 'Installation PWA',
        message: 'Voulez-vous installer ANTL sur votre appareil pour une meilleure expérience ?',
        confirmText: 'Installer',
        cancelText: 'Non merci'
      });

      if (shouldInstall && deferredPrompt) {
        deferredPrompt.prompt();
        
        deferredPrompt.userChoice.then((choiceResult: { outcome: string }) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('[PWA] User accepted the install prompt');
            resolve(true);
          } else {
            console.log('[PWA] User dismissed the install prompt');
            resolve(false);
          }
          deferredPrompt = null;
        });
      } else {
        resolve(false);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Nettoyage après 10 secondes
    setTimeout(() => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      if (!deferredPrompt) {
        resolve(false);
      }
    }, 10000);
  });
};

// Initialisation complète de la PWA
export const initializePWA = async (): Promise<void> => {
  if (!isProduction) {
    console.log('[PWA] Development mode - PWA features limited');
  }

  // Initialiser le timestamp au démarrage pour éviter la période de grace au premier chargement
  if (lastUpdateTime === 0) {
    lastUpdateTime = Date.now();
    console.log('[PWA] Initialized lastUpdateTime');
  }

  // Reset le flag de notification au démarrage pour permettre les notifications
  hasShownUpdateNotification = false;
  console.log('[PWA] Reset hasShownUpdateNotification flag');

  // Enregistrer le Service Worker
  const registration = await registerServiceWorker();

  // Ajouter les listeners de connexion
  addConnectionListeners(
    () => {
      // Connexion rétablie
      document.body.classList.remove('offline');
      document.body.classList.add('online');
    },
    () => {
      // Connexion perdue
      document.body.classList.remove('online');
      document.body.classList.add('offline');
    }
  );

  // Démarrer la vérification automatique des mises à jour
  if (registration) {
    console.log('[PWA] Starting automatic update checker');
    startUpdateChecker();
  }

  // Vérifier si l'app est déjà installée
  if (!isPWAInstalled()) {
    // Attendre un peu avant de proposer l'installation
    setTimeout(() => {
      showInstallPrompt();
    }, 5000);
  }

  console.log('[PWA] PWA initialization complete with auto-update');
};
