import { useCallback } from 'react';

export interface BackendError {
  status: 'error';
  code: string;
  message: string;
  errors?: Array<{ field: string; message: string }>;
  stack?: string;
}

export interface ErrorHandlerOptions {
  showToast?: boolean;
  logToConsole?: boolean;
  fallbackMessage?: string;
}

/**
 * Custom hook for consistent error handling across the app
 * Works with the backend's standardized error response format
 */
export function useErrorHandler() {
  const extractErrorMessage = useCallback((error: any): string => {
    // Handle network errors
    if (!error.response) {
      return 'Network error. Please check your connection.';
    }

    // Handle backend errors with our standard format
    if (error.response?.data?.message) {
      return error.response.data.message;
    }

    // Handle HTTP status codes
    switch (error.response?.status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Authentication required. Please log in.';
      case 403:
        return 'Access denied. You don\'t have permission for this action.';
      case 404:
        return 'Resource not found.';
      case 409:
        return 'Conflict. The resource already exists or is in use.';
      case 422:
        return 'Validation failed. Please check your input.';
      case 429:
        return 'Too many requests. Please try again later.';
      case 500:
        return 'Server error. Please try again later.';
      case 503:
        return 'Service unavailable. Please try again later.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }, []);

  const extractValidationErrors = useCallback((error: any): Array<{ field: string; message: string }> => {
    return error.response?.data?.errors || [];
  }, []);

  const handleError = useCallback((
    error: any, 
    options: ErrorHandlerOptions = {}
  ): { message: string; validationErrors: Array<{ field: string; message: string }> } => {
    const {
      logToConsole = true,
      fallbackMessage = 'An unexpected error occurred'
    } = options;

    if (logToConsole) {
      console.error('Error handled:', error);
    }

    const message = extractErrorMessage(error) || fallbackMessage;
    const validationErrors = extractValidationErrors(error);

    return { message, validationErrors };
  }, [extractErrorMessage, extractValidationErrors]);

  const isNetworkError = useCallback((error: any): boolean => {
    return !error.response;
  }, []);

  const isValidationError = useCallback((error: any): boolean => {
    return error.response?.data?.code === 'VALIDATION_ERROR' || 
           error.response?.status === 422 ||
           (error.response?.data?.errors && error.response.data.errors.length > 0);
  }, []);

  const isAuthError = useCallback((error: any): boolean => {
    return error.response?.status === 401;
  }, []);

  const isPermissionError = useCallback((error: any): boolean => {
    return error.response?.status === 403;
  }, []);

  return {
    handleError,
    extractErrorMessage,
    extractValidationErrors,
    isNetworkError,
    isValidationError,
    isAuthError,
    isPermissionError,
  };
}