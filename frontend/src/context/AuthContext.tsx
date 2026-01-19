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
      // Try to refresh token from HttpOnly cookie
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken) {
        try {
          // Verify token is still valid by making a test request
          const response = await authApi.refresh();
          setUser(response.data.user);
          localStorage.setItem('accessToken', response.data.accessToken);
        } catch {
          // Token refresh failed, clear access token
          localStorage.removeItem('accessToken');
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
