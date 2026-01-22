import { renderHook } from '@testing-library/react';
import { useErrorHandler } from '../useErrorHandler';

describe('useErrorHandler', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('extractErrorMessage', () => {
    it('handles network errors (no response)', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error('Network Error');
      
      const message = result.current.extractErrorMessage(error);
      expect(message).toBe('Network error. Please check your connection.');
    });

    it('extracts message from backend error response', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = {
        response: {
          data: {
            message: 'Custom backend error message'
          }
        }
      };
      
      const message = result.current.extractErrorMessage(error);
      expect(message).toBe('Custom backend error message');
    });

    it('handles 400 Bad Request', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = {
        response: {
          status: 400
        }
      };
      
      const message = result.current.extractErrorMessage(error);
      expect(message).toBe('Invalid request. Please check your input.');
    });

    it('handles 401 Unauthorized', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = {
        response: {
          status: 401
        }
      };
      
      const message = result.current.extractErrorMessage(error);
      expect(message).toBe('Authentication required. Please log in.');
    });

    it('handles 403 Forbidden', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = {
        response: {
          status: 403
        }
      };
      
      const message = result.current.extractErrorMessage(error);
      expect(message).toBe('Access denied. You don\'t have permission for this action.');
    });

    it('handles 404 Not Found', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = {
        response: {
          status: 404
        }
      };
      
      const message = result.current.extractErrorMessage(error);
      expect(message).toBe('Resource not found.');
    });

    it('handles 409 Conflict', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = {
        response: {
          status: 409
        }
      };
      
      const message = result.current.extractErrorMessage(error);
      expect(message).toBe('Conflict. The resource already exists or is in use.');
    });

    it('handles 422 Validation Error', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = {
        response: {
          status: 422
        }
      };
      
      const message = result.current.extractErrorMessage(error);
      expect(message).toBe('Validation failed. Please check your input.');
    });

    it('handles 429 Too Many Requests', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = {
        response: {
          status: 429
        }
      };
      
      const message = result.current.extractErrorMessage(error);
      expect(message).toBe('Too many requests. Please try again later.');
    });

    it('handles 500 Internal Server Error with specific message', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = {
        response: {
          status: 500,
          data: {
            error: 'Query execution failed: Syntax error'
          }
        }
      };
      
      const message = result.current.extractErrorMessage(error);
      expect(message).toBe('Query execution failed: Syntax error');
    });

    it('handles 500 Internal Server Error with details', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = {
        response: {
          status: 500,
          data: {
            details: 'Database connection timeout'
          }
        }
      };
      
      const message = result.current.extractErrorMessage(error);
      expect(message).toBe('Database connection timeout');
    });

    it('handles 500 Internal Server Error without specific message', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = {
        response: {
          status: 500
        }
      };
      
      const message = result.current.extractErrorMessage(error);
      expect(message).toBe('Server error. Please try again later.');
    });

    it('handles 503 Service Unavailable', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = {
        response: {
          status: 503
        }
      };
      
      const message = result.current.extractErrorMessage(error);
      expect(message).toBe('Service unavailable. Please try again later.');
    });

    it('handles unknown status codes with string response data', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = {
        response: {
          status: 418,
          data: 'I am a teapot'
        }
      };
      
      const message = result.current.extractErrorMessage(error);
      expect(message).toBe('I am a teapot');
    });

    it('handles unknown status codes with error field', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = {
        response: {
          status: 418,
          data: {
            error: 'Custom error message'
          }
        }
      };
      
      const message = result.current.extractErrorMessage(error);
      expect(message).toBe('Custom error message');
    });

    it('handles unknown status codes with details field', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = {
        response: {
          status: 418,
          data: {
            details: 'Detailed error information'
          }
        }
      };
      
      const message = result.current.extractErrorMessage(error);
      expect(message).toBe('Detailed error information');
    });

    it('handles unknown status codes with no useful data', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = {
        response: {
          status: 418,
          data: {}
        }
      };
      
      const message = result.current.extractErrorMessage(error);
      expect(message).toBe('An unexpected error occurred. Please try again.');
    });
  });

  describe('extractValidationErrors', () => {
    it('extracts validation errors from response', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = {
        response: {
          data: {
            errors: [
              { field: 'email', message: 'Email is required' },
              { field: 'password', message: 'Password must be at least 8 characters' }
            ]
          }
        }
      };
      
      const validationErrors = result.current.extractValidationErrors(error);
      expect(validationErrors).toEqual([
        { field: 'email', message: 'Email is required' },
        { field: 'password', message: 'Password must be at least 8 characters' }
      ]);
    });

    it('returns empty array when no validation errors', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = {
        response: {
          data: {}
        }
      };
      
      const validationErrors = result.current.extractValidationErrors(error);
      expect(validationErrors).toEqual([]);
    });

    it('returns empty array for network errors', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error('Network Error');
      
      const validationErrors = result.current.extractValidationErrors(error);
      expect(validationErrors).toEqual([]);
    });
  });

  describe('handleError', () => {
    it('handles error with default options', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = {
        response: {
          data: {
            message: 'Test error message'
          }
        }
      };
      
      const { message, validationErrors } = result.current.handleError(error);
      
      expect(message).toBe('Test error message');
      expect(validationErrors).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Error handled:', error);
    });

    it('handles error with custom fallback message', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error('Network Error');
      
      const { message } = result.current.handleError(error, {
        fallbackMessage: 'Custom fallback message'
      });
      
      expect(message).toBe('Network error. Please check your connection.');
    });

    it('handles error without console logging', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error('Test error');
      
      result.current.handleError(error, { logToConsole: false });
      
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('uses fallback message when extractErrorMessage returns empty', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = {
        response: {
          status: 999, // Unknown status that will fall through to default case
          data: {} // No useful error data
        }
      };
      
      const { message } = result.current.handleError(error, {
        fallbackMessage: 'Fallback used'
      });
      
      expect(message).toBe('An unexpected error occurred. Please try again.');
    });
  });

  describe('error type checkers', () => {
    it('identifies network errors', () => {
      const { result } = renderHook(() => useErrorHandler());
      const networkError = new Error('Network Error');
      const httpError = { response: { status: 500 } };
      
      expect(result.current.isNetworkError(networkError)).toBe(true);
      expect(result.current.isNetworkError(httpError)).toBe(false);
    });

    it('identifies validation errors by code', () => {
      const { result } = renderHook(() => useErrorHandler());
      const validationError = {
        response: {
          data: {
            code: 'VALIDATION_ERROR'
          }
        }
      };
      
      expect(result.current.isValidationError(validationError)).toBe(true);
    });

    it('identifies validation errors by status', () => {
      const { result } = renderHook(() => useErrorHandler());
      const validationError = {
        response: {
          status: 422
        }
      };
      
      expect(result.current.isValidationError(validationError)).toBe(true);
    });

    it('identifies validation errors by errors array', () => {
      const { result } = renderHook(() => useErrorHandler());
      const validationError = {
        response: {
          data: {
            errors: [{ field: 'email', message: 'Required' }]
          }
        }
      };
      
      expect(result.current.isValidationError(validationError)).toBe(true);
    });

    it('identifies auth errors', () => {
      const { result } = renderHook(() => useErrorHandler());
      const authError = {
        response: {
          status: 401
        }
      };
      
      expect(result.current.isAuthError(authError)).toBe(true);
      expect(result.current.isAuthError({ response: { status: 403 } })).toBe(false);
    });

    it('identifies permission errors', () => {
      const { result } = renderHook(() => useErrorHandler());
      const permissionError = {
        response: {
          status: 403
        }
      };
      
      expect(result.current.isPermissionError(permissionError)).toBe(true);
      expect(result.current.isPermissionError({ response: { status: 401 } })).toBe(false);
    });
  });

  describe('callback stability', () => {
    it('maintains stable references across re-renders', () => {
      const { result, rerender } = renderHook(() => useErrorHandler());
      
      const firstRender = {
        handleError: result.current.handleError,
        extractErrorMessage: result.current.extractErrorMessage,
        extractValidationErrors: result.current.extractValidationErrors,
        isNetworkError: result.current.isNetworkError,
        isValidationError: result.current.isValidationError,
        isAuthError: result.current.isAuthError,
        isPermissionError: result.current.isPermissionError,
      };
      
      rerender();
      
      expect(result.current.handleError).toBe(firstRender.handleError);
      expect(result.current.extractErrorMessage).toBe(firstRender.extractErrorMessage);
      expect(result.current.extractValidationErrors).toBe(firstRender.extractValidationErrors);
      expect(result.current.isNetworkError).toBe(firstRender.isNetworkError);
      expect(result.current.isValidationError).toBe(firstRender.isValidationError);
      expect(result.current.isAuthError).toBe(firstRender.isAuthError);
      expect(result.current.isPermissionError).toBe(firstRender.isPermissionError);
    });
  });
});