import React, { ReactNode, useState, useCallback, useEffect, useMemo } from 'react';
import { AlertContext, ShowAlertOptions, ShowNumberConfirmOptions } from './AlertContext';
import { Alert } from '../../views/components/index.ts';
import type { AlertProps } from '../../views/components/index.ts';
import { initializeAlertService } from '../../utils/services/index.ts';

interface AlertProviderProps {
  children: ReactNode;
}

interface ActiveAlert extends Omit<AlertProps, 'onConfirm' | 'onCancel' | 'onClose'> {
  resolve: (value: boolean | number | null) => void;
}

export const AlertProvider: React.FC<AlertProviderProps> = ({ children }) => {
  const [alerts, setAlerts] = useState<ActiveAlert[]>([]);

  const removeAlert = useCallback((id: string) => {
    setAlerts(current => current.filter(alert => alert.id !== id));
  }, []);

  const showAlert = useCallback((options: ShowAlertOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      const id = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const newAlert: ActiveAlert = {
        id,
        type: options.type,
        title: options.title,
        message: options.message,
        autoClose: options.autoClose,
        confirmText: options.confirmText,
        cancelText: options.cancelText,
        resolve: (value) => resolve(value === true)
      };

      setAlerts(current => [...current, newAlert]);
    });
  }, []);

  const showConfirm = useCallback((message: string, title?: string, confirmText?: string, cancelText?: string): Promise<boolean> => {
    return showAlert({
      type: 'confirm',
      title: title || 'Confirmation',
      message,
      confirmText,
      cancelText
    });
  }, [showAlert]);

  const showNumberConfirm = useCallback((options: ShowNumberConfirmOptions): Promise<number | null> => {
    return new Promise((resolve) => {
      const id = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newAlert: ActiveAlert = {
        id,
        type: 'confirm',
        title: options.title || 'Confirmation',
        message: options.message,
        confirmText: options.confirmText,
        cancelText: options.cancelText,
        numberInput: {
          label: options.label,
          initialValue: options.initialValue ?? 1,
          min: options.min ?? 1,
          max: options.max,
        },
        resolve: (value) => resolve(typeof value === 'number' ? value : null),
      };

      setAlerts(current => [...current, newAlert]);
    });
  }, []);

  const showInfo = useCallback((message: string, title?: string, autoClose = 4000): Promise<boolean> => {
    return showAlert({
      type: 'info',
      title: title || 'Information',
      message,
      autoClose
    });
  }, [showAlert]);

  const showSuccess = useCallback((message: string, title?: string, autoClose = 3000): Promise<boolean> => {
    return showAlert({
      type: 'success',
      title: title || 'Succès',
      message,
      autoClose
    });
  }, [showAlert]);

  const showWarning = useCallback((message: string, title?: string, autoClose = 5000): Promise<boolean> => {
    return showAlert({
      type: 'warning',
      title: title || 'Attention',
      message,
      autoClose
    });
  }, [showAlert]);

  const showError = useCallback((message: string, title?: string, autoClose = 6000): Promise<boolean> => {
    return showAlert({
      type: 'error',
      title: title || 'Erreur',
      message,
      autoClose
    });
  }, [showAlert]);

  const handleConfirm = useCallback((id: string, value?: number) => {
    const alert = alerts.find(a => a.id === id);
    if (alert) {
      alert.resolve(alert.numberInput ? (value ?? null) : true);
      removeAlert(id);
    }
  }, [alerts, removeAlert]);

  const handleCancel = useCallback((id: string) => {
    const alert = alerts.find(a => a.id === id);
    if (alert) {
      alert.resolve(false);
      removeAlert(id);
    }
  }, [alerts, removeAlert]);

  const handleClose = useCallback((id: string) => {
    const alert = alerts.find(a => a.id === id);
    if (alert) {
      // Pour les alertes non-confirmation, on résout à true (action terminée)
      // Pour les confirmations, on résout à false (action annulée)
      alert.resolve(alert.type !== 'confirm');
      removeAlert(id);
    }
  }, [alerts, removeAlert]);

  const contextValue = useMemo(() => ({
    showAlert,
    showConfirm,
    showNumberConfirm,
    showInfo,
    showSuccess,
    showWarning,
    showError
  }), [showAlert, showConfirm, showNumberConfirm, showInfo, showSuccess, showWarning, showError]);

  // Initialiser le service d'alerte au montage du provider
  useEffect(() => {
    initializeAlertService(contextValue);
    // Exposer le service globalement pour les fallbacks legacy
    (window as unknown as Record<string, unknown>).antl_alert_service = contextValue;

    return () => {
      (window as unknown as Record<string, unknown>).antl_alert_service = null;
    };
  }, [contextValue]);

  // Écouter les événements PWA pour les alertes depuis le service worker
  useEffect(() => {
    const handlePWAConfirm = (event: CustomEvent) => {
      const { title, message, confirmText, cancelText, resolve } = event.detail;
      showConfirm(message, title, confirmText, cancelText).then(resolve);
    };

    const handlePWAInfo = (event: CustomEvent) => {
      const { title, message, resolve } = event.detail;
      showInfo(message, title).then(() => resolve());
    };

    window.addEventListener('pwa-confirm-needed', handlePWAConfirm as EventListener);
    window.addEventListener('pwa-info-needed', handlePWAInfo as EventListener);

    return () => {
      window.removeEventListener('pwa-confirm-needed', handlePWAConfirm as EventListener);
      window.removeEventListener('pwa-info-needed', handlePWAInfo as EventListener);
    };
  }, [showConfirm, showInfo]);

  return (
    <AlertContext.Provider value={contextValue}>
      {children}
      {alerts.map(alert => (
        <Alert
          key={alert.id}
          id={alert.id}
          type={alert.type}
          title={alert.title}
          message={alert.message}
          autoClose={alert.autoClose}
          confirmText={alert.confirmText}
          cancelText={alert.cancelText}
          numberInput={alert.numberInput}
          onConfirm={(value) => handleConfirm(alert.id, value)}
          onCancel={() => handleCancel(alert.id)}
          onClose={() => handleClose(alert.id)}
        />
      ))}
    </AlertContext.Provider>
  );
};
