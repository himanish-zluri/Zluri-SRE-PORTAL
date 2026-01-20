import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      // Always try to refresh token from HttpOnly cookie on app initialization
      // This handles cases where access token expired but refresh token is still valid
      try {
        console.log('Attempting token refresh on app initialization...');
        const response = await authApi.refresh();
        console.log('Token refresh successful');
        setUser(response.data.user);
        localStorage.setItem('accessToken', response.data.accessToken);
      } catch (error: any) {
        // Refresh failed - could be no refresh token, expired refresh token, or network error
        const status = error?.response?.status;
        const errorMessage = error?.response?.data?.error || error?.message;
        
        console.log(`Token refresh failed: ${status} - ${errorMessage}`);
        
        // Clear any stale access token
        localStorage.removeItem('accessToken');
        setUser(null);
        
        // Only log detailed error in development
        if (process.env.NODE_ENV === 'development') {
          console.log('Full refresh error:', error);
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    // Only store access token in localStorage (refresh token is in HttpOnly cookie)
    localStorage.setItem('accessToken', response.data.accessToken);
    setUser(response.data.user);
  };

  const logout = async () => {
    try {
      // Call logout endpoint to clear HttpOnly cookie
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local state and access token
      localStorage.removeItem('accessToken');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
