import axios from 'axios';

// Mock axios
jest.mock('axios', () => {
  const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  };
  return {
    create: jest.fn(() => mockAxiosInstance),
    post: jest.fn(),
  };
});

// Get the mocked axios instance
const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockAxiosInstance = mockedAxios.create() as jest.Mocked<ReturnType<typeof axios.create>>;

// Import after mocking
import { authApi, instancesApi, databasesApi, podsApi, usersApi, queriesApi, auditApi } from '../api';

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('axios instance configuration', () => {
    it('creates axios instance', () => {
      expect(mockedAxios.create).toBeDefined();
    });
  });

  describe('authApi', () => {
    it('login calls POST /auth/login with credentials', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: { accessToken: 'token' } });
      
      await authApi.login('test@example.com', 'password123');
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('refresh calls POST /auth/refresh with refreshToken', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: { accessToken: 'newToken' } });
      
      await authApi.refresh('refreshToken123');
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/refresh', {
        refreshToken: 'refreshToken123',
      });
    });

    it('logout calls POST /auth/logout with refreshToken', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: {} });
      
      await authApi.logout('refreshToken123');
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/logout', {
        refreshToken: 'refreshToken123',
      });
    });

    it('logoutAll calls POST /auth/logout-all', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: {} });
      
      await authApi.logoutAll();
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/logout-all');
    });
  });

  describe('instancesApi', () => {
    it('getAll calls GET /instances without params when no type', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [] });
      
      await instancesApi.getAll();
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/instances', { params: {} });
    });

    it('getAll calls GET /instances with type param', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [] });
      
      await instancesApi.getAll('POSTGRES');
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/instances', { params: { type: 'POSTGRES' } });
    });
  });

  describe('databasesApi', () => {
    it('getByInstance calls GET /databases with instanceId', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [] });
      
      await databasesApi.getByInstance('inst-123');
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/databases', { params: { instanceId: 'inst-123' } });
    });
  });

  describe('podsApi', () => {
    it('getAll calls GET /pods', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [] });
      
      await podsApi.getAll();
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/pods');
    });

    it('getById calls GET /pods/:id', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: {} });
      
      await podsApi.getById('pod-123');
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/pods/pod-123');
    });
  });

  describe('usersApi', () => {
    it('getAll calls GET /users', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [] });
      
      await usersApi.getAll();
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/users');
    });
  });

  describe('queriesApi', () => {
    it('getForApproval calls GET /queries with params', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { data: [], pagination: {} } });
      
      await queriesApi.getForApproval({ status: 'PENDING', limit: 10 });
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/queries', {
        params: { status: 'PENDING', limit: 10 },
      });
    });

    it('getForApproval calls GET /queries without params', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { data: [], pagination: {} } });
      
      await queriesApi.getForApproval();
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/queries', {
        params: undefined,
      });
    });

    it('getMySubmissions calls GET /queries/my-submissions', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { data: [], pagination: {} } });
      
      await queriesApi.getMySubmissions({ limit: 10, offset: 0 });
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/queries/my-submissions', {
        params: { limit: 10, offset: 0 },
      });
    });

    it('getMySubmissions calls GET /queries/my-submissions without params', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { data: [], pagination: {} } });
      
      await queriesApi.getMySubmissions();
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/queries/my-submissions', {
        params: undefined,
      });
    });

    it('submit calls POST /queries with JSON data', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: {} });
      
      const queryData = {
        instanceId: 'inst-1',
        databaseName: 'test_db',
        queryText: 'SELECT 1',
        podId: 'pod-1',
        comments: 'Test',
        submissionType: 'QUERY' as const,
      };
      
      await queriesApi.submit(queryData);
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/queries', queryData);
    });

    it('submit calls POST /queries with FormData for scripts', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: {} });
      
      const formData = new FormData();
      formData.append('instanceId', 'inst-1');
      
      await queriesApi.submit(formData);
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/queries', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    });

    it('approve calls POST /queries/:id/approve', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: {} });
      
      await queriesApi.approve('query-123');
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/queries/query-123/approve');
    });

    it('reject calls POST /queries/:id/reject with reason', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: {} });
      
      await queriesApi.reject('query-123', 'Not approved');
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/queries/query-123/reject', {
        reason: 'Not approved',
      });
    });
  });

  describe('auditApi', () => {
    it('getAll calls GET /audit with params', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [] });
      
      await auditApi.getAll({ limit: 10, userId: 'user-1' });
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/audit', {
        params: { limit: 10, userId: 'user-1' },
      });
    });

    it('getAll calls GET /audit without params', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [] });
      
      await auditApi.getAll();
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/audit', {
        params: undefined,
      });
    });

    it('getByQuery calls GET /audit/query/:queryId', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [] });
      
      await auditApi.getByQuery('query-123');
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/audit/query/query-123');
    });
  });
});
