// Create a mock axios instance
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  },
};

// Mock axios before importing the API module
jest.mock('axios', () => ({
  create: jest.fn(() => mockAxiosInstance),
  post: jest.fn(),
}));

import axios from 'axios';
import { 
  authApi, 
  instancesApi, 
  databasesApi, 
  podsApi, 
  usersApi, 
  queriesApi, 
  auditApi 
} from '../api';

const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeChild: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock import.meta.env for test environment
(globalThis as any).import = {
  meta: {
    env: {
      MODE: 'test',
      VITE_API_URL: 'http://test-api.com/api'
    }
  }
};

describe('API Services', () => {
  beforeAll(() => {
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockAxiosInstance.get.mockResolvedValue({ data: {} });
    mockAxiosInstance.post.mockResolvedValue({ data: {} });
  });

  describe('Environment Variable Handling', () => {
    it('should handle missing import.meta in test environment', () => {
      // Temporarily remove import.meta
      const originalImport = (globalThis as any).import;
      delete (globalThis as any).import;
      
      // Re-import the module to test the fallback
      jest.resetModules();
      const { authApi: testAuthApi } = require('../api');
      
      // Should still work with default values
      expect(testAuthApi).toBeDefined();
      
      // Restore import.meta
      (globalThis as any).import = originalImport;
    });

    it('should handle missing env in import.meta', () => {
      // Temporarily modify import.meta to not have env
      const originalImport = (globalThis as any).import;
      (globalThis as any).import = { meta: {} };
      
      // Re-import the module to test the fallback
      jest.resetModules();
      const { authApi: testAuthApi } = require('../api');
      
      // Should still work with default values
      expect(testAuthApi).toBeDefined();
      
      // Restore import.meta
      (globalThis as any).import = originalImport;
    });

    it('should handle non-test environment without import.meta', () => {
      // Set up non-test environment
      const originalImport = (globalThis as any).import;
      (globalThis as any).import = {
        meta: {
          env: {
            MODE: 'production',
            VITE_API_URL: 'https://prod-api.com/api'
          }
        }
      };
      
      // Re-import the module
      jest.resetModules();
      const { authApi: testAuthApi } = require('../api');
      
      // Should work in production mode
      expect(testAuthApi).toBeDefined();
      
      // Restore import.meta
      (globalThis as any).import = originalImport;
    });
  });

  describe('authApi', () => {
    it('should login with email and password', async () => {
      const mockResponse = { data: { user: { id: '1', email: 'test@test.com' }, accessToken: 'token' } };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await authApi.login('test@test.com', 'password');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@test.com',
        password: 'password'
      });
      expect(result).toEqual(mockResponse);
    });

    it('should refresh token', async () => {
      const mockResponse = { data: { accessToken: 'new-token', user: { id: '1' } } };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await authApi.refresh('refresh-token');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/refresh', {
        refreshToken: 'refresh-token'
      });
      expect(result).toEqual(mockResponse);
    });

    it('should logout with refresh token', async () => {
      const mockResponse = { data: { success: true } };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await authApi.logout('refresh-token');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/logout', {
        refreshToken: 'refresh-token'
      });
      expect(result).toEqual(mockResponse);
    });

    it('should logout all sessions', async () => {
      const mockResponse = { data: { success: true } };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await authApi.logoutAll();

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/logout-all');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('instancesApi', () => {
    it('should get all instances without type filter', async () => {
      const mockResponse = { data: [{ id: '1', name: 'instance1' }] };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await instancesApi.getAll();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/instances', { params: {} });
      expect(result).toEqual(mockResponse);
    });

    it('should get all instances with type filter', async () => {
      const mockResponse = { data: [{ id: '1', name: 'instance1', type: 'POSTGRES' }] };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await instancesApi.getAll('POSTGRES');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/instances', { params: { type: 'POSTGRES' } });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('databasesApi', () => {
    it('should get databases by instance', async () => {
      const mockResponse = { data: [{ database_name: 'db1' }] };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await databasesApi.getByInstance('instance-1');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/databases', {
        params: { instanceId: 'instance-1' }
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('podsApi', () => {
    it('should get all pods', async () => {
      const mockResponse = { data: [{ id: '1', name: 'pod1' }] };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await podsApi.getAll();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/pods');
      expect(result).toEqual(mockResponse);
    });

    it('should get pod by id', async () => {
      const mockResponse = { data: { id: '1', name: 'pod1' } };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await podsApi.getById('1');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/pods/1');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('usersApi', () => {
    it('should get all users', async () => {
      const mockResponse = { data: [{ id: '1', name: 'User 1', email: 'user1@test.com', role: 'DEVELOPER' }] };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await usersApi.getAll();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/users');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('queriesApi', () => {
    it('should get queries for approval without params', async () => {
      const mockResponse = { 
        data: { 
          data: [{ id: '1', status: 'PENDING' }], 
          pagination: { total: 1, limit: 10, offset: 0, hasMore: false } 
        } 
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await queriesApi.getForApproval();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/queries', { params: undefined });
      expect(result).toEqual(mockResponse);
    });

    it('should get queries for approval with params', async () => {
      const mockResponse = { 
        data: { 
          data: [{ id: '1', status: 'PENDING' }], 
          pagination: { total: 1, limit: 5, offset: 10, hasMore: true } 
        } 
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const params = { status: 'PENDING', type: 'QUERY', limit: 5, offset: 10 };
      const result = await queriesApi.getForApproval(params);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/queries', { params });
      expect(result).toEqual(mockResponse);
    });

    it('should get my submissions without params', async () => {
      const mockResponse = { 
        data: { 
          data: [{ id: '1', status: 'EXECUTED' }], 
          pagination: { total: 1, limit: 10, offset: 0, hasMore: false } 
        } 
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await queriesApi.getMySubmissions();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/queries/my-submissions', { params: undefined });
      expect(result).toEqual(mockResponse);
    });

    it('should get my submissions with params', async () => {
      const mockResponse = { 
        data: { 
          data: [{ id: '1', status: 'EXECUTED' }], 
          pagination: { total: 1, limit: 25, offset: 0, hasMore: false } 
        } 
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const params = { status: 'EXECUTED', limit: 25 };
      const result = await queriesApi.getMySubmissions(params);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/queries/my-submissions', { params });
      expect(result).toEqual(mockResponse);
    });

    it('should get query by id', async () => {
      const mockResponse = { data: { id: '1', status: 'PENDING', query_text: 'SELECT * FROM users' } };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await queriesApi.getById('1');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/queries/1');
      expect(result).toEqual(mockResponse);
    });

    it('should submit query with FormData', async () => {
      const mockResponse = { data: { id: '1', status: 'PENDING' } };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const formData = new FormData();
      formData.append('instanceId', 'instance-1');
      formData.append('queryText', 'SELECT * FROM users');

      const result = await queriesApi.submit(formData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/queries', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      expect(result).toEqual(mockResponse);
    });

    it('should submit query with object data', async () => {
      const mockResponse = { data: { id: '1', status: 'PENDING' } };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const queryData = {
        instanceId: 'instance-1',
        databaseName: 'test_db',
        queryText: 'SELECT * FROM users',
        podId: 'pod-1',
        comments: 'Test query',
        submissionType: 'QUERY' as const
      };

      const result = await queriesApi.submit(queryData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/queries', queryData);
      expect(result).toEqual(mockResponse);
    });

    it('should approve query', async () => {
      const mockResponse = { data: { status: 'EXECUTED', result: { rows: [] } } };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await queriesApi.approve('1');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/queries/1/approve');
      expect(result).toEqual(mockResponse);
    });

    it('should reject query without reason', async () => {
      const mockResponse = { data: { id: '1', status: 'REJECTED' } };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await queriesApi.reject('1');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/queries/1/reject', { reason: undefined });
      expect(result).toEqual(mockResponse);
    });

    it('should reject query with reason', async () => {
      const mockResponse = { data: { id: '1', status: 'REJECTED', rejection_reason: 'Invalid query' } };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await queriesApi.reject('1', 'Invalid query');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/queries/1/reject', { reason: 'Invalid query' });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('auditApi', () => {
    it('should get all audit logs without params', async () => {
      const mockResponse = { data: [{ id: '1', action: 'QUERY_EXECUTED' }] };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await auditApi.getAll();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/audit', { params: undefined });
      expect(result).toEqual(mockResponse);
    });

    it('should get all audit logs with params', async () => {
      const mockResponse = { data: [{ id: '1', action: 'QUERY_EXECUTED' }] };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const params = {
        limit: 50,
        offset: 0,
        userId: 'user-1',
        queryId: 'query-1',
        databaseName: 'test_db',
        action: 'QUERY_EXECUTED',
        querySearch: '123',
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      };

      const result = await auditApi.getAll(params);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/audit', { params });
      expect(result).toEqual(mockResponse);
    });

    it('should get audit logs by query', async () => {
      const mockResponse = { data: [{ id: '1', query_id: 'query-1', action: 'QUERY_EXECUTED' }] };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await auditApi.getByQuery('query-1');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/audit/query/query-1');
      expect(result).toEqual(mockResponse);
    });
  });
});