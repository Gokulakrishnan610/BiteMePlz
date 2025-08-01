import { useState, useCallback } from 'react';

interface PopupState {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning' | 'info' | 'localhost';
  title: string;
  message: string;
  autoClose?: boolean;
  duration?: number;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
  }>;
}

export const usePopup = () => {
  const [popup, setPopup] = useState<PopupState>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  const showPopup = useCallback((config: Omit<PopupState, 'isOpen'>) => {
    setPopup({
      ...config,
      isOpen: true
    });
  }, []);

  const closePopup = useCallback(() => {
    setPopup(prev => ({ ...prev, isOpen: false }));
  }, []);

  const showSuccess = useCallback((title: string, message: string, options?: Partial<PopupState>) => {
    showPopup({
      type: 'success',
      title,
      message,
      autoClose: true,
      duration: 5000,
      ...options
    });
  }, [showPopup]);

  const showError = useCallback((title: string, message: string, options?: Partial<PopupState>) => {
    showPopup({
      type: 'error',
      title,
      message,
      autoClose: false,
      ...options
    });
  }, [showPopup]);

  const showWarning = useCallback((title: string, message: string, options?: Partial<PopupState>) => {
    showPopup({
      type: 'warning',
      title,
      message,
      autoClose: false,
      ...options
    });
  }, [showPopup]);

  const showInfo = useCallback((title: string, message: string, options?: Partial<PopupState>) => {
    showPopup({
      type: 'info',
      title,
      message,
      autoClose: true,
      duration: 5000,
      ...options
    });
  }, [showPopup]);

  const showLocalhost = useCallback((title: string, message: string, options?: Partial<PopupState>) => {
    showPopup({
      type: 'localhost',
      title,
      message,
      autoClose: true,
      duration: 8000,
      ...options
    });
  }, [showPopup]);

  return {
    popup,
    showPopup,
    closePopup,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLocalhost
  };
};