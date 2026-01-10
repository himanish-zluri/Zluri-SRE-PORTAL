import { Response } from 'express';
import { AuditController } from '../../../src/modules/audit/audit.controller';
import { AuditRepository } from '../../../src/modules/audit/audit.repository';
import { AuthenticatedRequest } from '../../../src/middlewares/auth.middleware';

jest.mock('../../../src/modules/audit/audit.repository');

describe('AuditController', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockResponse = { json: jsonMock, status: statusMock };
    jest.clearAllMocks();
  });

  describe('getAuditLogs', () => {
    it('should return audit logs with default pagination', async () => {
      const mockLogs = [
        { id: 'log-1', action: 'SUBMITTED' },
        { id: 'log-2', action: 'APPROVED' }
      ];
      (AuditRepository.findAll as jest.Mock).mockResolvedValue(mockLogs);

      mockRequest = {
        user: { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' },
        query: {}
      };

      await AuditController.getAuditLogs(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(AuditRepository.findAll).toHaveBeenCalledWith(100, 0);
      expect(jsonMock).toHaveBeenCalledWith(mockLogs);
    });

    it('should return audit logs with custom pagination', async () => {
      const mockLogs = [{ id: 'log-1' }];
      (AuditRepository.findAll as jest.Mock).mockResolvedValue(mockLogs);

      mockRequest = {
        user: { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' },
        query: { limit: '50', offset: '10' }
      };

      await AuditController.getAuditLogs(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(AuditRepository.findAll).toHaveBeenCalledWith(50, 10);
    });

    it('should filter by queryId when provided', async () => {
      const mockLogs = [{ id: 'log-1', query_request_id: 'query-1' }];
      (AuditRepository.findByQueryId as jest.Mock).mockResolvedValue(mockLogs);

      mockRequest = {
        user: { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' },
        query: { queryId: 'query-1' }
      };

      await AuditController.getAuditLogs(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(AuditRepository.findByQueryId).toHaveBeenCalledWith('query-1');
      expect(jsonMock).toHaveBeenCalledWith(mockLogs);
    });

    it('should filter by userId when provided', async () => {
      const mockLogs = [{ id: 'log-1', performed_by: 'user-1' }];
      (AuditRepository.findByUserId as jest.Mock).mockResolvedValue(mockLogs);

      mockRequest = {
        user: { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' },
        query: { userId: 'user-1', limit: '50', offset: '10' }
      };

      await AuditController.getAuditLogs(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(AuditRepository.findByUserId).toHaveBeenCalledWith('user-1', 50, 10);
      expect(jsonMock).toHaveBeenCalledWith(mockLogs);
    });

    it('should return 500 on error', async () => {
      (AuditRepository.findAll as jest.Mock).mockRejectedValue(new Error('DB error'));

      mockRequest = {
        user: { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' },
        query: {}
      };

      await AuditController.getAuditLogs(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Failed to get audit logs', error: 'DB error' });
    });
  });

  describe('getAuditLogsByQuery', () => {
    it('should return audit logs for a specific query', async () => {
      const mockLogs = [
        { id: 'log-1', action: 'SUBMITTED', query_request_id: 'query-1' },
        { id: 'log-2', action: 'EXECUTED', query_request_id: 'query-1' }
      ];
      (AuditRepository.findByQueryId as jest.Mock).mockResolvedValue(mockLogs);

      mockRequest = {
        user: { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' },
        params: { queryId: 'query-1' }
      };

      await AuditController.getAuditLogsByQuery(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(AuditRepository.findByQueryId).toHaveBeenCalledWith('query-1');
      expect(jsonMock).toHaveBeenCalledWith(mockLogs);
    });

    it('should return 500 on error', async () => {
      (AuditRepository.findByQueryId as jest.Mock).mockRejectedValue(new Error('DB error'));

      mockRequest = {
        user: { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' },
        params: { queryId: 'query-1' }
      };

      await AuditController.getAuditLogsByQuery(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Failed to get audit logs', error: 'DB error' });
    });
  });
});
