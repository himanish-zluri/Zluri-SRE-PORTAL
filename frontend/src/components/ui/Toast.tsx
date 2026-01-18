import { useEffect, useState } from 'react';

export interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type, isVisible, onClose, duration = 3000 }: ToastProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setTimeout(onClose, 300); // Wait for slide-out animation
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible && !isAnimating) return null;

  const getToastStyles = () => {
    const baseStyles = 'px-4 py-3 rounded-lg shadow-lg border flex items-center gap-3 min-w-[300px] max-w-[400px]';
    
    switch (type) {
      case 'success':
        return `${baseStyles} bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200`;
      case 'error':
        return `${baseStyles} bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200`;
      case 'warning':
        return `${baseStyles} bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200`;
      case 'info':
      default:
        return `${baseStyles} bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200`;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 transition-all duration-300 ease-in-out ${
        isAnimating 
          ? 'transform translate-x-0 opacity-100' 
          : 'transform translate-x-full opacity-0'
      }`}
    >
      <div className={getToastStyles()}>
        <span className="text-lg">{getIcon()}</span>
        <span className="font-medium">{message}</span>
        <button
          onClick={() => {
            setIsAnimating(false);
            setTimeout(onClose, 300);
          }}
          className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// Hook for managing toast state
export function useToast() {
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    isVisible: boolean;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToast({ message, type, isVisible: true });
  };

  const hideToast = () => {
    setToast(prev => prev ? { ...prev, isVisible: false } : null);
  };

  return {
    toast,
    showToast,
    hideToast,
    showSuccess: (message: string) => showToast(message, 'success'),
    showError: (message: string) => showToast(message, 'error'),
    showWarning: (message: string) => showToast(message, 'warning'),
    showInfo: (message: string) => showToast(message, 'info'),
  };
}