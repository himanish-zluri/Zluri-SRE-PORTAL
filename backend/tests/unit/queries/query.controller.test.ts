import { Response } from 'express';
import { QueryController } from '../../../src/modules/queries/query.controller';
import { QueryService } from '../../../src/modules/queries/query.service';
import { AuthenticatedRequest } from '../../../src/middlewares/auth.middleware';
import { BadRequestError } from '../../../src/errors';

jest.mock('../../../src/modules/queries/query.service');

describe('QueryController', () => {
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

  describe('submit', () => {
    it('should submit query successfully', async () => {
      const mockQuery = { id: 'q1', status: 'PENDING' };
      (QueryService.submitQuery as jest.Mock).mockResolvedValue(mockQuery);

      mockRequest = {
        user: { id: 'user-1', email: 'test@test.com', role: 'DEVELOPER' },
        body: {
          instanceId: 'inst-1',
          databaseName: 'db',
          queryText: 'SELECT 1',
          podId: 'pod-a',
          comments: 'test',
          submissionType: 'QUERY'
        }
      };

      await QueryController.submit(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(mockQuery);
    });

    it('should throw BadRequestError when script file missing for SCRIPT submission', async () => {
      mockRequest = {
        user: { id: 'user-1', email: 'test@test.com', role: 'DEVELOPER' },
        body: {
          instanceId: 'inst-1',
          databaseName: 'db',
          podId: 'pod-a',
          comments: 'test',
          submissionType: 'SCRIPT'
        },
        file: undefined
      };

      await expect(QueryController.submit(mockRequest as AuthenticatedRequest, mockResponse as Response))
        .rejects.toThrow(BadRequestError);
    });

    it('should submit script with file successfully', async () => {
      const mockQuery = { id: 'q1', status: 'PENDING' };
      (QueryService.submitQuery as jest.Mock).mockResolvedValue(mockQuery);

      mockRequest = {
        user: { id: 'user-1', email: 'test@test.com', role: 'DEVELOPER' },
        body: {
          instanceId: 'inst-1',
          databaseName: 'db',
          podId: 'pod-a',
          comments: 'test',
          submissionType: 'SCRIPT'
        },
        file: { buffer: Buffer.from('console.log("hello");') } as any
      };

      await QueryController.submit(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(QueryService.submitQuery).toHaveBeenCalledWith(expect.objectContaining({
        scriptContent: 'console.log("hello");'
      }));
    });

    it('should throw error on service error (caught by global handler)', async () => {
      (QueryService.submitQuery as jest.Mock).mockRejectedValue(new Error('DB error'));

      mockRequest = {
        user: { id: 'user-1', email: 'test@test.com', role: 'DEVELOPER' },
        body: {
          instanceId: 'inst-1',
          databaseName: 'db',
          queryText: 'SELECT 1',
          podId: 'pod-a',
          comments: 'test',
          submissionType: 'QUERY'
        }
      };

      await expect(QueryController.submit(mockRequest as AuthenticatedRequest, mockResponse as Response))
        .rejects.toThrow('DB error');
    });
  });

  describe('approve', () => {
    it('should approve query successfully', async () => {
      const mockResult = { status: 'EXECUTED', result: { rows: [] } };
      (QueryService.approveQuery as jest.Mock).mockResolvedValue(mockResult);

      mockRequest = {
        user: { id: 'manager-1', email: 'manager@test.com', role: 'MANAGER' },
        params: { id: 'query-1' }
      };

      await QueryController.approve(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(QueryService.approveQuery).toHaveBeenCalledWith('query-1', 'manager-1');
      expect(jsonMock).toHaveBeenCalledWith(mockResult);
    });

    it('should throw error on approval error (caught by global handler)', async () => {
      (QueryService.approveQuery as jest.Mock).mockRejectedValue(new Error('Execution failed'));

      mockRequest = {
        user: { id: 'manager-1', email: 'manager@test.com', role: 'MANAGER' },
        params: { id: 'query-1' }
      };

      await expect(QueryController.approve(mockRequest as AuthenticatedRequest, mockResponse as Response))
        .rejects.toThrow('Execution failed');
    });
  });

  describe('reject', () => {
    it('should reject query with reason', async () => {
      const mockResult = { status: 'REJECTED' };
      (QueryService.rejectQuery as jest.Mock).mockResolvedValue(mockResult);

      mockRequest = {
        user: { id: 'manager-1', email: 'manager@test.com', role: 'MANAGER' },
        params: { id: 'query-1' },
        body: { reason: 'Not approved' }
      };

      await QueryController.reject(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(QueryService.rejectQuery).toHaveBeenCalledWith('query-1', 'manager-1', 'MANAGER', 'Not approved');
      expect(jsonMock).toHaveBeenCalledWith(mockResult);
    });

    it('should reject query without reason', async () => {
      const mockResult = { status: 'REJECTED' };
      (QueryService.rejectQuery as jest.Mock).mockResolvedValue(mockResult);

      mockRequest = {
        user: { id: 'manager-1', email: 'manager@test.com', role: 'MANAGER' },
        params: { id: 'query-1' },
        body: undefined
      };

      await QueryController.reject(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(QueryService.rejectQuery).toHaveBeenCalledWith('query-1', 'manager-1', 'MANAGER', undefined);
    });

    it('should throw error on rejection error (caught by global handler)', async () => {
      (QueryService.rejectQuery as jest.Mock).mockRejectedValue(new Error('Not authorized'));

      mockRequest = {
        user: { id: 'manager-1', email: 'manager@test.com', role: 'MANAGER' },
        params: { id: 'query-1' },
        body: {}
      };

      await expect(QueryController.reject(mockRequest as AuthenticatedRequest, mockResponse as Response))
        .rejects.toThrow('Not authorized');
    });
  });

  describe('getQueries', () => {
    const mockPaginatedResponse = {
      data: [{ id: 'q1' }],
      pagination: { total: 1, limit: 10, offset: 0, hasMore: false }
    };

    it('should return manager queries when role is MANAGER', async () => {
      (QueryService.getQueriesForManager as jest.Mock).mockResolvedValue(mockPaginatedResponse);

      mockRequest = {
        user: { id: 'manager-1', email: 'manager@test.com', role: 'MANAGER' },
        query: {}
      };

      await QueryController.getQueries(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(QueryService.getQueriesForManager).toHaveBeenCalledWith('manager-1', undefined, undefined, { limit: undefined, offset: undefined });
      expect(jsonMock).toHaveBeenCalledWith(mockPaginatedResponse);
    });

    it('should return manager queries with status filter', async () => {
      (QueryService.getQueriesForManager as jest.Mock).mockResolvedValue(mockPaginatedResponse);

      mockRequest = {
        user: { id: 'manager-1', email: 'manager@test.com', role: 'MANAGER' },
        query: { status: 'PENDING,APPROVED' }
      };

      await QueryController.getQueries(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(QueryService.getQueriesForManager).toHaveBeenCalledWith('manager-1', ['PENDING', 'APPROVED'], undefined, { limit: undefined, offset: undefined });
    });

    it('should return all queries when role is ADMIN', async () => {
      (QueryService.getAllQueries as jest.Mock).mockResolvedValue(mockPaginatedResponse);

      mockRequest = {
        user: { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' },
        query: {}
      };

      await QueryController.getQueries(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(QueryService.getAllQueries).toHaveBeenCalledWith(undefined, undefined, { limit: undefined, offset: undefined });
      expect(jsonMock).toHaveBeenCalledWith(mockPaginatedResponse);
    });

    it('should return empty result for DEVELOPER role', async () => {
      mockRequest = {
        user: { id: 'dev-1', email: 'dev@test.com', role: 'DEVELOPER' },
        query: {}
      };

      await QueryController.getQueries(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({ data: [], pagination: { total: 0, limit: 0, offset: 0, hasMore: false } });
    });

    it('should throw error on service error (caught by global handler)', async () => {
      (QueryService.getQueriesForManager as jest.Mock).mockRejectedValue(new Error('DB error'));

      mockRequest = {
        user: { id: 'manager-1', email: 'manager@test.com', role: 'MANAGER' },
        query: {}
      };

      await expect(QueryController.getQueries(mockRequest as AuthenticatedRequest, mockResponse as Response))
        .rejects.toThrow('DB error');
    });
  });

  describe('getMySubmissions', () => {
    const mockPaginatedResponse = {
      data: [{ id: 'q1' }],
      pagination: { total: 1, limit: 10, offset: 0, hasMore: false }
    };

    it('should return user own submissions', async () => {
      (QueryService.getQueriesByUser as jest.Mock).mockResolvedValue(mockPaginatedResponse);

      mockRequest = {
        user: { id: 'user-1', email: 'test@test.com', role: 'DEVELOPER' },
        query: {}
      };

      await QueryController.getMySubmissions(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(QueryService.getQueriesByUser).toHaveBeenCalledWith('user-1', undefined, undefined, { limit: undefined, offset: undefined });
      expect(jsonMock).toHaveBeenCalledWith(mockPaginatedResponse);
    });

    it('should return submissions with filters', async () => {
      (QueryService.getQueriesByUser as jest.Mock).mockResolvedValue(mockPaginatedResponse);

      mockRequest = {
        user: { id: 'user-1', email: 'test@test.com', role: 'DEVELOPER' },
        query: { status: 'PENDING', type: 'QUERY', limit: '10', offset: '0' }
      };

      await QueryController.getMySubmissions(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(QueryService.getQueriesByUser).toHaveBeenCalledWith('user-1', ['PENDING'], 'QUERY', { limit: 10, offset: 0 });
    });

    it('should throw error on service error (caught by global handler)', async () => {
      (QueryService.getQueriesByUser as jest.Mock).mockRejectedValue(new Error('DB error'));

      mockRequest = {
        user: { id: 'user-1', email: 'test@test.com', role: 'DEVELOPER' },
        query: {}
      };

      await expect(QueryController.getMySubmissions(mockRequest as AuthenticatedRequest, mockResponse as Response))
        .rejects.toThrow('DB error');
    });
  });
});
