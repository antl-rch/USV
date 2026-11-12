// Service pour faciliter l'utilisation des alertes depuis n'importe où dans l'application
// Ce service remplace les alert(), confirm() et console.log() natifs

import type { AlertContextType } from '../../context/alert/index.ts';

// Interface pour les alertes PWA/Service Worker
interface PWAAlertOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

// Instance singleton du service d'alerte
let alertService: AlertContextType | null = null;
const pendingServiceWaiters: Array<(context: AlertContextType) => void> = [];

// Initialise le service avec le contexte d'alerte
export const initializeAlertService = (context: AlertContextType): void => {
  alertService = context;
  while (pendingServiceWaiters.length > 0) {
    const waiter = pendingServiceWaiters.shift();
    waiter?.(context);
  }
};

// Vérifie que le service est initialisé
const ensureServiceInitialized = (): AlertContextType => {
  if (!alertService) {
    throw new Error('AlertService not initialized. Make sure AlertProvider is mounted.');
  }
  return alertService;
};

// Remplace window.alert()
export const alert = async (message: string, title?: string): Promise<void> => {
  const service = ensureServiceInitialized();
  await service.showInfo(message, title);
};

// Remplace window.confirm()
export const confirm = async (message: string, title?: string, confirmText?: string, cancelText?: string): Promise<boolean> => {
  const service = ensureServiceInitialized();
  return await service.showConfirm(message, title, confirmText, cancelText);
};

// Notifications de succès
export const showSuccess = async (message: string, title?: string): Promise<void> => {
  const service = ensureServiceInitialized();
  await service.showSuccess(message, title);
};

// Notifications d'erreur
export const showError = async (message: string, title?: string): Promise<void> => {
  const service = ensureServiceInitialized();
  await service.showError(message, title);
};

// Notifications d'avertissement
export const showWarning = async (message: string, title?: string): Promise<void> => {
  const service = ensureServiceInitialized();
  await service.showWarning(message, title);
};

// Notifications d'information
export const showInfo = async (message: string, title?: string): Promise<void> => {
  const service = ensureServiceInitialized();
  await service.showInfo(message, title);
};

// Service complet pour usage avancé
export const getAlertService = (): AlertContextType => {
  return ensureServiceInitialized();
};

// Fonctions PWA spéciales qui créent des événements personnalisés pour communiquer avec React
export const showPWAUpdatePrompt = (options: PWAAlertOptions): Promise<boolean> => {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    // Si le service React est disponible, l'utiliser directement avec les libellés personnalisés
    if (alertService) {
      alertService.showConfirm(options.message, options.title, options.confirmText, options.cancelText).then(finish);
      return;
    }

    // Si React est en cours de montage, attendre l'initialisation d'AlertProvider
    pendingServiceWaiters.push((service) => {
      service.showConfirm(options.message, options.title, options.confirmText, options.cancelText).then(finish);
    });

    // Créer aussi l'événement personnalisé au cas où AlertProvider écoute déjà
    const eventDetail = { ...options, resolve: finish };
    const event = new CustomEvent('pwa-confirm-needed', { detail: eventDetail });
    window.dispatchEvent(event);

    // Fallback après 10 secondes si React ne répond toujours pas
    setTimeout(() => {
      if (!settled) {
        const fallbackResult = window.confirm(`${options.title}\n\n${options.message}`);
        finish(fallbackResult);
      }
    }, 10000);
  });
};

export const showPWAInfo = (options: PWAAlertOptions): Promise<void> => {
  return new Promise((resolve) => {
    // Si le service React est disponible, l'utiliser
    if (alertService) {
      alertService.showInfo(options.message, options.title).then(() => resolve());
      return;
    }

    // Sinon, créer un événement personnalisé
    const eventDetail = { ...options, resolve };
    const event = new CustomEvent('pwa-info-needed', { detail: eventDetail });
    window.dispatchEvent(event);

    // Fallback après 5 secondes
    setTimeout(() => {
      window.alert(`${options.title}\n\n${options.message}`);
      resolve();
    }, 5000);
  });
};

// Override des fonctions globales pour capturer les usages accidentels
if (typeof window !== 'undefined') {
  const originalAlert = window.alert;
  const originalConfirm = window.confirm;
  
  // En développement, avertir si on utilise encore les fonctions natives
  if (import.meta.env.DEV) {
    window.alert = (message?: string) => {
      console.warn('⚠️ window.alert() utilisé! Utilisez alertService.alert() à la place');
      console.trace();
      return originalAlert(message || '');
    };
    
    window.confirm = (message?: string) => {
      console.warn('⚠️ window.confirm() utilisé! Utilisez alertService.confirm() à la place');
      console.trace();
      return originalConfirm(message || '');
    };
  }
}
