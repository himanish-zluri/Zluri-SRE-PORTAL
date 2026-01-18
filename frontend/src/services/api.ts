import axios from 'axios';
import type { AuthResponse, DbInstance, Pod, Query, AuditLog } from '../types';

// Helper function to get environment variables that works in both Vite and Jest
function getEnvVar(key: string, defaultValue?: string): string | undefined {
  // In test environment, use the mocked values
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    const mockImportMeta = (globalThis as any).import?.meta;
    if (mockImportMeta?.env) {
      return mockImportMeta.env[key] || defaultValue;
    }
    return defaultValue;
  }
  
  // In Vite environment, try to access import.meta.env safely
  try {
    // Use eval to avoid TypeScript compilation issues
    const importMeta = eval('import.meta');
    if (importMeta?.env) {
      return importMeta.env[key] || defaultValue;
    }
  } catch {
    // Fallback if import.meta is not available
  }
  
  return defaultValue;
}

// Use a function to get the API URL so it can be mocked in tests
const getApiUrl = () => {
  // In test environment, use a default URL
  if (getEnvVar('MODE') === 'test') {
    return '/api';
  }
  
  // Use Vite environment variable
  return getEnvVar('VITE_API_URL') || 'https://zluri-sre-backend.onrender.com/api';
};

const api = axios.create({
  baseURL: getApiUrl(),
});

// Request interceptor to add auth token
/* istanbul ignore next */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle token refresh
/* istanbul ignore next */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const refreshUrl = getEnvVar('MODE') === 'test' ? '/api/auth/refresh' : `${getApiUrl()}/auth/refresh`;
          const response = await axios.post(refreshUrl, { refreshToken });
          const { accessToken } = response.data;
          localStorage.setItem('accessToken', accessToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),
  
  refresh: (refreshToken: string) =>
    api.post<{ accessToken: string; user: AuthResponse['user'] }>('/auth/refresh', { refreshToken }),
  
  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),
  
  logoutAll: () =>
    api.post('/auth/logout-all'),
};

// Instances
export const instancesApi = {
  getAll: (type?: string) =>
    api.get<DbInstance[]>('/instances', { params: type ? { type } : {} }),
};

// Databases
export const databasesApi = {
  getByInstance: (instanceId: string) =>
    api.get<{ database_name: string }[]>('/databases', { params: { instanceId } }),
};

// Pods
export const podsApi = {
  getAll: () => api.get<Pod[]>('/pods'),
  getById: (id: string) => api.get<Pod>(`/pods/${id}`),
};

// Users
export const usersApi = {
  getAll: () => api.get<{ id: string; name: string; email: string; role: string }[]>('/users'),
};

// Queries
export const queriesApi = {
  // Get queries submitted to manager/admin for approval (Manager/Admin only)
  getForApproval: (params?: { status?: string; type?: string; limit?: number; offset?: number }) =>
    api.get<{ data: Query[]; pagination: { total: number; limit: number; offset: number; hasMore: boolean } }>('/queries', { params }),
  
  // Get user's own submitted queries (all users)
  getMySubmissions: (params?: { status?: string; type?: string; limit?: number; offset?: number }) =>
    api.get<{ data: Query[]; pagination: { total: number; limit: number; offset: number; hasMore: boolean } }>('/queries/my-submissions', { params }),
  
  submit: (data: FormData | {
    instanceId: string;
    databaseName: string;
    queryText: string;
    podId: string;
    comments: string;
    submissionType: 'QUERY' | 'SCRIPT';
  }) => {
    if (data instanceof FormData) {
      return api.post<Query>('/queries', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return api.post<Query>('/queries', data);
  },
  
  approve: (id: string) =>
    api.post<{ status: string; result: any }>(`/queries/${id}/approve`),
  
  reject: (id: string, reason?: string) =>
    api.post<Query>(`/queries/${id}/reject`, { reason }),
};

// Audit
export const auditApi = {
  getAll: (params?: { limit?: number; offset?: number; userId?: string; queryId?: string; databaseName?: string }) =>
    api.get<AuditLog[]>('/audit', { params }),
  
  getByQuery: (queryId: string) =>
    api.get<AuditLog[]>(`/audit/query/${queryId}`),
};

export default api;
