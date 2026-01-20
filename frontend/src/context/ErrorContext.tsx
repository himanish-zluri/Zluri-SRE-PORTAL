import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { Toast } from '../components/ui/Toast';

interface ErrorContextType {
  showError: (error: any, options?: { persist?: boolean; fallbackMessage?: string }) => void;
  showSuccess: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
  clearError: () => void;
}

const ErrorContext = createContext<ErrorContextType | null>(null);

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    isVisible: boolean;
  } | null>(null);

  const { handleError } = useErrorHandler();

  const showError = useCallback((error: any, options: { persist?: boolean; fallbackMessage?: string } = {}) => {
    const { message } = handleError(error, {
      fallbackMessage: options.fallbackMessage
    });
    
    setToast({
      message,
      type: 'error',
      isVisible: true
    });
  }, [handleError]);

  const showSuccess = useCallback((message: string) => {
    setToast({
      message,
      type: 'success',
      isVisible: true
    });
  }, []);

  const showWarning = useCallback((message: string) => {
    setToast({
      message,
      type: 'warning',
      isVisible: true
    });
  }, []);

  const showInfo = useCallback((message: string) => {
    setToast({
      message,
      type: 'info',
      isVisible: true
    });
  }, []);

  const clearError = useCallback(() => {
    setToast(prev => prev ? { ...prev, isVisible: false } : null);
  }, []);

  return (
    <ErrorContext.Provider value={{
      showError,
      showSuccess,
      showWarning,
      showInfo,
      clearError
    }}>
      {children}
      
      {/* Global Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={clearError}
        />
      )}
    </ErrorContext.Provider>
  );
}

export function useError() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
}