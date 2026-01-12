import axios from 'axios';
import type { AuthResponse, DbInstance, Pod, Query, AuditLog } from '../types';

const api = axios.create({
  baseURL: '/api',
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post('/api/auth/refresh', { refreshToken });
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

// Queries
export const queriesApi = {
  getAll: (params?: { user?: string; status?: string }) =>
    api.get<Query[]>('/queries', { params }),
  
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
