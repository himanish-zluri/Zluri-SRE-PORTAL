import axios from 'axios';

// Mock process.env for Jest
process.env.NODE_ENV = 'test';

// Mock axios completely
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock axios.create to return a mocked instance
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() }
  }
};

mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

// Import the actual API functions after mocking
import { authApi, instancesApi, databasesApi, podsApi, usersApi, queriesApi, auditApi } from '../api';

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });
  });

  describe('authApi', () => {
    it('should call login endpoint with correct data', async () => {
      const mockResponse = { data: { accessToken: 'token', user: { id: '1', email: 'test@test.com' } } };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await authApi.login('test@test.com', 'password');
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/login', { 
        email: 'test@test.com', 
        password: 'password' 
      });
      expect(result).toEqual(mockResponse);
    });

    it('should call refresh endpoint with correct data', async () => {
      const mockResponse = { data: { accessToken: 'newToken', user: { id: '1' } } };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await authApi.refresh('refreshToken');
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/refresh', { refreshToken: 'refreshToken' });
      expect(result).toEqual(mockResponse);
    });

    it('should call logout endpoint', async () => {
      const mockResponse = { data: {} };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      await authApi.logout('refreshToken');
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/logout', { refreshToken: 'refreshToken' });
    });

    it('should call logout-all endpoint', async () => {
      const mockResponse = { data: {} };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      await authApi.logoutAll();
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/logout-all');
    });
  });

  describe('instancesApi', () => {
    it('should get all instances', async () => {
      const mockInstances = [{ id: '1', name: 'test-instance' }];
      const mockResponse = { data: mockInstances };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await instancesApi.getAll();
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/instances', { params: {} });
      expect(result).toEqual(mockResponse);
    });

    it('should get instances by type', async () => {
      const mockInstances = [{ id: '1', name: 'test-instance', type: 'postgres' }];
      const mockResponse = { data: mockInstances };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await instancesApi.getAll('postgres');
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/instances', { params: { type: 'postgres' } });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('databasesApi', () => {
    it('should get databases by instance', async () => {
      const mockDatabases = [{ database_name: 'test_db' }];
      const mockResponse = { data: mockDatabases };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await databasesApi.getByInstance('1');
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/databases', { params: { instanceId: '1' } });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('podsApi', () => {
    it('should get all pods', async () => {
      const mockPods = [{ id: '1', name: 'test-pod' }];
      const mockResponse = { data: mockPods };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await podsApi.getAll();
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/pods');
      expect(result).toEqual(mockResponse);
    });

    it('should get pod by id', async () => {
      const mockPod = { id: '1', name: 'test-pod' };
      const mockResponse = { data: mockPod };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await podsApi.getById('1');
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/pods/1');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('usersApi', () => {
    it('should get all users', async () => {
      const mockUsers = [{ id: '1', name: 'Test User', email: 'test@test.com', role: 'user' }];
      const mockResponse = { data: mockUsers };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await usersApi.getAll();
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/users');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('queriesApi', () => {
    it('should get queries for approval', async () => {
      const mockResponse = { data: { data: [], pagination: { total: 0, limit: 10, offset: 0, hasMore: false } } };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await queriesApi.getForApproval();
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/queries', { params: undefined });
      expect(result).toEqual(mockResponse);
    });

    it('should get my submissions', async () => {
      const mockResponse = { data: { data: [], pagination: { total: 0, limit: 10, offset: 0, hasMore: false } } };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await queriesApi.getMySubmissions();
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/queries/my-submissions', { params: undefined });
      expect(result).toEqual(mockResponse);
    });

    it('should submit query with FormData', async () => {
      const mockQuery = { id: '1', queryText: 'SELECT * FROM test' };
      const mockResponse = { data: mockQuery };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const formData = new FormData();
      formData.append('queryText', 'SELECT * FROM test');

      const result = await queriesApi.submit(formData);
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/queries', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should submit query with object data', async () => {
      const mockQuery = { id: '1', queryText: 'SELECT * FROM test' };
      const mockResponse = { data: mockQuery };
      const queryData = {
        instanceId: '1',
        databaseName: 'test_db',
        queryText: 'SELECT * FROM test',
        podId: '1',
        comments: 'Test query',
        submissionType: 'QUERY' as const,
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await queriesApi.submit(queryData);
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/queries', queryData);
      expect(result).toEqual(mockResponse);
    });

    it('should approve query', async () => {
      const mockResponse = { data: { status: 'approved', result: {} } };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await queriesApi.approve('1');
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/queries/1/approve');
      expect(result).toEqual(mockResponse);
    });

    it('should reject query', async () => {
      const mockQuery = { id: '1', status: 'rejected' };
      const mockResponse = { data: mockQuery };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await queriesApi.reject('1', 'Invalid query');
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/queries/1/reject', { reason: 'Invalid query' });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('auditApi', () => {
    it('should get all audit logs', async () => {
      const mockAuditLogs = [{ id: '1', action: 'query_executed' }];
      const mockResponse = { data: mockAuditLogs };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await auditApi.getAll();
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/audit', { params: undefined });
      expect(result).toEqual(mockResponse);
    });

    it('should get audit logs with params', async () => {
      const mockAuditLogs = [{ id: '1', action: 'query_executed' }];
      const mockResponse = { data: mockAuditLogs };
      const params = { limit: 10, offset: 0, userId: '1' };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await auditApi.getAll(params);
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/audit', { params });
      expect(result).toEqual(mockResponse);
    });

    it('should get audit logs by query', async () => {
      const mockAuditLogs = [{ id: '1', queryId: '1', action: 'query_executed' }];
      const mockResponse = { data: mockAuditLogs };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await auditApi.getByQuery('1');
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/audit/query/1');
      expect(result).toEqual(mockResponse);
    });
  });
});
