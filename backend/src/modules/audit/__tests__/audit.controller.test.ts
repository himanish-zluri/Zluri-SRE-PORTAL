import { Response } from 'express';
import { AuditController } from '../../../modules/audit/audit.controller';
import { AuditRepository } from '../../../modules/audit/audit.repository';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';

jest.mock('../../../modules/audit/audit.repository');

describe('AuditController', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    mockResponse = { json: jsonMock };
    jest.clearAllMocks();
  });

  // Helper to create mock audit log entity
  const createMockLog = (id: string, action: string, queryId = 'query-1') => ({
    id,
    action,
    queryRequest: { id: queryId },
    performedBy: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
    details: {},
    createdAt: new Date('2025-01-15'),
  });

  describe('getAuditLogs', () => {
    it('should return audit logs with default pagination', async () => {
      const mockLogs = [
        createMockLog('log-1', 'SUBMITTED'),
        createMockLog('log-2', 'APPROVED'),
      ];
      (AuditRepository.findAll as jest.Mock).mockResolvedValue(mockLogs);

      mockRequest = {
        user: { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' },
        query: {}
      };

      await AuditController.getAuditLogs(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(AuditRepository.findAll).toHaveBeenCalledWith(100, 0);
      expect(jsonMock).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ id: 'log-1', action: 'SUBMITTED' }),
        expect.objectContaining({ id: 'log-2', action: 'APPROVED' }),
      ]));
    });

    it('should return audit logs with custom pagination', async () => {
      const mockLogs = [createMockLog('log-1', 'SUBMITTED')];
      (AuditRepository.findAll as jest.Mock).mockResolvedValue(mockLogs);

      mockRequest = {
        user: { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' },
        query: { limit: '50', offset: '10' }
      };

      await AuditController.getAuditLogs(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(AuditRepository.findAll).toHaveBeenCalledWith(50, 10);
    });

    it('should filter by queryId when provided', async () => {
      const mockLogs = [createMockLog('log-1', 'SUBMITTED', 'query-1')];
      (AuditRepository.findByQueryId as jest.Mock).mockResolvedValue(mockLogs);

      mockRequest = {
        user: { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' },
        query: { queryId: 'query-1' }
      };

      await AuditController.getAuditLogs(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(AuditRepository.findByQueryId).toHaveBeenCalledWith('query-1');
      expect(jsonMock).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ query_request_id: 'query-1' }),
      ]));
    });

    it('should filter by userId when provided', async () => {
      const mockLogs = [createMockLog('log-1', 'SUBMITTED')];
      (AuditRepository.findWithFilters as jest.Mock).mockResolvedValue(mockLogs);

      mockRequest = {
        user: { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' },
        query: { userId: 'user-1', limit: '50', offset: '10' }
      };

      await AuditController.getAuditLogs(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(AuditRepository.findWithFilters).toHaveBeenCalledWith({
        userId: 'user-1',
        instanceId: undefined,
        databaseName: undefined,
        action: undefined,
        queryId: undefined,
        startDate: undefined,
        endDate: undefined,
        limit: 50,
        offset: 10,
      });
      expect(jsonMock).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ performed_by: 'user-1' }),
      ]));
    });

    it('should filter by databaseName when provided', async () => {
      const mockLogs = [createMockLog('log-1', 'SUBMITTED')];
      (AuditRepository.findWithFilters as jest.Mock).mockResolvedValue(mockLogs);

      mockRequest = {
        user: { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' },
        query: { databaseName: 'production_db', limit: '50', offset: '10' }
      };

      await AuditController.getAuditLogs(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(AuditRepository.findWithFilters).toHaveBeenCalledWith({
        userId: undefined,
        instanceId: undefined,
        databaseName: 'production_db',
        action: undefined,
        queryId: undefined,
        startDate: undefined,
        endDate: undefined,
        limit: 50,
        offset: 10,
      });
    });

    it('should filter by instanceId when provided', async () => {
      const mockLogs = [createMockLog('log-1', 'SUBMITTED')];
      (AuditRepository.findWithFilters as jest.Mock).mockResolvedValue(mockLogs);

      mockRequest = {
        user: { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' },
        query: { instanceId: 'instance-1', limit: '50', offset: '10' }
      };

      await AuditController.getAuditLogs(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(AuditRepository.findWithFilters).toHaveBeenCalledWith({
        userId: undefined,
        instanceId: 'instance-1',
        databaseName: undefined,
        action: undefined,
        queryId: undefined,
        startDate: undefined,
        endDate: undefined,
        limit: 50,
        offset: 10,
      });
    });

    it('should filter by action when provided', async () => {
      const mockLogs = [createMockLog('log-1', 'EXECUTED')];
      (AuditRepository.findWithFilters as jest.Mock).mockResolvedValue(mockLogs);

      mockRequest = {
        user: { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' },
        query: { action: 'EXECUTED' }
      };

      await AuditController.getAuditLogs(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(AuditRepository.findWithFilters).toHaveBeenCalledWith({
        userId: undefined,
        instanceId: undefined,
        databaseName: undefined,
        action: 'EXECUTED',
        queryId: undefined,
        startDate: undefined,
        endDate: undefined,
        limit: 100,
        offset: 0,
      });
    });

    it('should filter by querySearch when provided', async () => {
      const mockLogs = [createMockLog('log-1', 'SUBMITTED')];
      (AuditRepository.findWithFilters as jest.Mock).mockResolvedValue(mockLogs);

      mockRequest = {
        user: { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' },
        query: { querySearch: 'abc123' }
      };

      await AuditController.getAuditLogs(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(AuditRepository.findWithFilters).toHaveBeenCalledWith({
        userId: undefined,
        instanceId: undefined,
        databaseName: undefined,
        action: undefined,
        queryId: 'abc123',
        startDate: undefined,
        endDate: undefined,
        limit: 100,
        offset: 0,
      });
    });

    it('should filter by date range when provided', async () => {
      const mockLogs = [createMockLog('log-1', 'SUBMITTED')];
      (AuditRepository.findWithFilters as jest.Mock).mockResolvedValue(mockLogs);

      mockRequest = {
        user: { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' },
        query: { 
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-12-31T23:59:59Z'
        }
      };

      await AuditController.getAuditLogs(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(AuditRepository.findWithFilters).toHaveBeenCalledWith({
        userId: undefined,
        instanceId: undefined,
        databaseName: undefined,
        action: undefined,
        queryId: undefined,
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-12-31T23:59:59Z'),
        limit: 100,
        offset: 0,
      });
    });

    it('should handle multiple filters combined', async () => {
      const mockLogs = [createMockLog('log-1', 'SUBMITTED')];
      (AuditRepository.findWithFilters as jest.Mock).mockResolvedValue(mockLogs);

      mockRequest = {
        user: { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' },
        query: { 
          userId: 'user-1',
          databaseName: 'prod_db',
          action: 'EXECUTED',
          querySearch: 'abc123',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          limit: '25',
          offset: '5'
        }
      };

      await AuditController.getAuditLogs(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(AuditRepository.findWithFilters).toHaveBeenCalledWith({
        userId: 'user-1',
        instanceId: undefined,
        databaseName: 'prod_db',
        action: 'EXECUTED',
        queryId: 'abc123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        limit: 25,
        offset: 5,
      });
    });

    it('should throw error on repository error (caught by global handler)', async () => {
      (AuditRepository.findAll as jest.Mock).mockRejectedValue(new Error('DB error'));

      mockRequest = {
        user: { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' },
        query: {}
      };

      await expect(AuditController.getAuditLogs(mockRequest as AuthenticatedRequest, mockResponse as Response))
        .rejects.toThrow('DB error');
    });
  });

  describe('getAuditLogsByQuery', () => {
    it('should return audit logs for a specific query', async () => {
      const mockLogs = [
        createMockLog('log-1', 'SUBMITTED', 'query-1'),
        createMockLog('log-2', 'EXECUTED', 'query-1'),
      ];
      (AuditRepository.findByQueryId as jest.Mock).mockResolvedValue(mockLogs);

      mockRequest = {
        user: { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' },
        params: { queryId: 'query-1' }
      };

      await AuditController.getAuditLogsByQuery(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(AuditRepository.findByQueryId).toHaveBeenCalledWith('query-1');
      expect(jsonMock).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ id: 'log-1', action: 'SUBMITTED', query_request_id: 'query-1' }),
        expect.objectContaining({ id: 'log-2', action: 'EXECUTED', query_request_id: 'query-1' }),
      ]));
    });

    it('should throw error on repository error (caught by global handler)', async () => {
      (AuditRepository.findByQueryId as jest.Mock).mockRejectedValue(new Error('DB error'));

      mockRequest = {
        user: { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' },
        params: { queryId: 'query-1' }
      };

      await expect(AuditController.getAuditLogsByQuery(mockRequest as AuthenticatedRequest, mockResponse as Response))
        .rejects.toThrow('DB error');
    });
  });
});
