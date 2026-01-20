import { renderHook } from '@testing-library/react';
import { useErrorHandler } from '../useErrorHandler';

describe('useErrorHandler', () => {
  it('extracts error message from backend response', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    const mockError = {
      response: {
        data: {
          status: 'error',
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          errors: [{ field: 'email', message: 'Email is required' }]
        }
      }
    };

    const { message, validationErrors } = result.current.handleError(mockError);
    
    expect(message).toBe('Validation failed');
    expect(validationErrors).toHaveLength(1);
    expect(validationErrors[0]).toEqual({ field: 'email', message: 'Email is required' });
  });

  it('handles network errors', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    const networkError = { message: 'Network Error' }; // No response property
    
    const { message } = result.current.handleError(networkError);
    
    expect(message).toBe('Network error. Please check your connection.');
    expect(result.current.isNetworkError(networkError)).toBe(true);
  });

  it('handles HTTP status codes', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    const unauthorizedError = {
      response: { status: 401 }
    };
    
    const { message } = result.current.handleError(unauthorizedError);
    
    expect(message).toBe('Authentication required. Please log in.');
    expect(result.current.isAuthError(unauthorizedError)).toBe(true);
  });
});