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
  withCredentials: true, // Send cookies with requests
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
    
    // Don't try to refresh tokens on auth requests
    const isAuthRequest = originalRequest.url?.includes('/auth/login') || 
                         originalRequest.url?.includes('/auth/refresh') || 
                         originalRequest.url?.includes('/auth/logout');
    
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh token using HttpOnly cookie
        const refreshUrl = getEnvVar('MODE') === 'test' ? '/api/auth/refresh' : `${getApiUrl()}/auth/refresh`;
        const response = await axios.post(refreshUrl, {}, { withCredentials: true });
        const { accessToken } = response.data;
        localStorage.setItem('accessToken', accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear token and redirect only if not already on login page
        localStorage.removeItem('accessToken');
        if (!window.location.pathname.includes('/login')) {
          // Create a custom error for better handling
          const authError = new Error('Session expired. Please log in again.');
          authError.name = 'AuthenticationError';
          window.location.href = '/login';
          return Promise.reject(authError);
        }
      }
    }
    
    // Enhance error object with more context for better error handling
    if (error.response) {
      error.isNetworkError = false;
      error.statusCode = error.response.status;
      error.errorData = error.response.data;
    } else {
      error.isNetworkError = true;
      error.statusCode = null;
      error.errorData = null;
    }
    
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ accessToken: string; user: AuthResponse['user'] }>('/auth/login', { email, password }),
  
  refresh: () =>
    api.post<{ accessToken: string; user: AuthResponse['user'] }>('/auth/refresh'),
  
  logout: () =>
    api.post('/auth/logout'),
  
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
  
  // Get stats for approval dashboard (total counts by status)
  getApprovalStats: () =>
    api.get<{ PENDING: number; EXECUTED: number; FAILED: number; REJECTED: number }>('/queries', { 
      params: { limit: 1, offset: 0, statsOnly: true } 
    }).then(response => {
      // Since we don't have a dedicated stats endpoint, we'll make multiple calls
      return Promise.all([
        api.get('/queries', { params: { status: 'PENDING', limit: 1 } }),
        api.get('/queries', { params: { status: 'EXECUTED', limit: 1 } }),
        api.get('/queries', { params: { status: 'FAILED', limit: 1 } }),
        api.get('/queries', { params: { status: 'REJECTED', limit: 1 } })
      ]).then(([pending, executed, failed, rejected]) => ({
        data: {
          PENDING: pending.data.pagination?.total || 0,
          EXECUTED: executed.data.pagination?.total || 0,
          FAILED: failed.data.pagination?.total || 0,
          REJECTED: rejected.data.pagination?.total || 0,
        }
      }));
    }),
  
  // Get stats for my submissions (total counts by status)
  getMySubmissionsStats: () =>
    Promise.all([
      api.get('/queries/my-submissions', { params: { status: 'PENDING', limit: 1 } }),
      api.get('/queries/my-submissions', { params: { status: 'EXECUTED', limit: 1 } }),
      api.get('/queries/my-submissions', { params: { status: 'FAILED', limit: 1 } }),
      api.get('/queries/my-submissions', { params: { status: 'REJECTED', limit: 1 } })
    ]).then(([pending, executed, failed, rejected]) => ({
      data: {
        PENDING: pending.data.pagination?.total || 0,
        EXECUTED: executed.data.pagination?.total || 0,
        FAILED: failed.data.pagination?.total || 0,
        REJECTED: rejected.data.pagination?.total || 0,
      }
    })),
  
  // Get query details by ID
  getById: (id: string) =>
    api.get<Query>(`/queries/${id}`),
  
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
  getAll: (params?: { 
    limit?: number; 
    offset?: number; 
    userId?: string; 
    queryId?: string; 
    databaseName?: string; 
    action?: string;
    querySearch?: string; // This will be used for query ID search
    startDate?: string;
    endDate?: string;
  }) =>
    api.get<AuditLog[]>('/audit', { params }),
  
  // Get stats for audit page (total counts by action)
  getStats: () =>
    Promise.all([
      api.get('/audit', { params: { action: 'SUBMITTED', limit: 1 } }),
      api.get('/audit', { params: { action: 'EXECUTED', limit: 1 } }),
      api.get('/audit', { params: { action: 'FAILED', limit: 1 } }),
      api.get('/audit', { params: { action: 'REJECTED', limit: 1 } })
    ]).then(([submitted, executed, failed, rejected]) => ({
      data: {
        SUBMITTED: submitted.data?.pagination?.total || submitted.data?.length || 0,
        EXECUTED: executed.data?.pagination?.total || executed.data?.length || 0,
        FAILED: failed.data?.pagination?.total || failed.data?.length || 0,
        REJECTED: rejected.data?.pagination?.total || rejected.data?.length || 0,
      }
    })),
  
  getByQuery: (queryId: string) =>
    api.get<AuditLog[]>(`/audit/query/${queryId}`),
};

export default api;
