import { Response } from 'express';
import { QueryController } from '../../../src/modules/queries/query.controller';
import { QueryService } from '../../../src/modules/queries/query.service';
import { AuthenticatedRequest } from '../../../src/middlewares/auth.middleware';

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

    it('should return 400 when script file missing for SCRIPT submission', async () => {
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

      await QueryController.submit(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Script file required for SCRIPT submission' });
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
        file: { path: '/uploads/script.js' } as any
      };

      await QueryController.submit(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(QueryService.submitQuery).toHaveBeenCalledWith(expect.objectContaining({
        scriptPath: '/uploads/script.js'
      }));
    });

    it('should return 500 on service error', async () => {
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

      await QueryController.submit(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Failed to submit query', error: 'DB error' });
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

    it('should return 500 on approval error', async () => {
      (QueryService.approveQuery as jest.Mock).mockRejectedValue(new Error('Execution failed'));

      mockRequest = {
        user: { id: 'manager-1', email: 'manager@test.com', role: 'MANAGER' },
        params: { id: 'query-1' }
      };

      await QueryController.approve(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Query execution failed', error: 'Execution failed' });
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

      expect(QueryService.rejectQuery).toHaveBeenCalledWith('query-1', 'manager-1', 'Not approved');
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

      expect(QueryService.rejectQuery).toHaveBeenCalledWith('query-1', 'manager-1', undefined);
    });

    it('should return 500 on rejection error', async () => {
      (QueryService.rejectQuery as jest.Mock).mockRejectedValue(new Error('Not authorized'));

      mockRequest = {
        user: { id: 'manager-1', email: 'manager@test.com', role: 'MANAGER' },
        params: { id: 'query-1' },
        body: {}
      };

      await QueryController.reject(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('getQueries', () => {
    it('should return user queries when user=me', async () => {
      const mockQueries = [{ id: 'q1' }];
      (QueryService.getQueriesByUser as jest.Mock).mockResolvedValue(mockQueries);

      mockRequest = {
        user: { id: 'user-1', email: 'test@test.com', role: 'DEVELOPER' },
        query: { user: 'me' }
      };

      await QueryController.getQueries(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(QueryService.getQueriesByUser).toHaveBeenCalledWith('user-1', undefined, undefined);
      expect(jsonMock).toHaveBeenCalledWith(mockQueries);
    });

    it('should return user queries with status filter', async () => {
      const mockQueries = [{ id: 'q1', status: 'PENDING' }];
      (QueryService.getQueriesByUser as jest.Mock).mockResolvedValue(mockQueries);

      mockRequest = {
        user: { id: 'user-1', email: 'test@test.com', role: 'DEVELOPER' },
        query: { user: 'me', status: 'PENDING,APPROVED' }
      };

      await QueryController.getQueries(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(QueryService.getQueriesByUser).toHaveBeenCalledWith('user-1', ['PENDING', 'APPROVED'], undefined);
    });

    it('should return user queries with type filter', async () => {
      const mockQueries = [{ id: 'q1' }];
      (QueryService.getQueriesByUser as jest.Mock).mockResolvedValue(mockQueries);

      mockRequest = {
        user: { id: 'user-1', email: 'test@test.com', role: 'DEVELOPER' },
        query: { user: 'me', type: 'POSTGRES' }
      };

      await QueryController.getQueries(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(QueryService.getQueriesByUser).toHaveBeenCalledWith('user-1', undefined, 'POSTGRES');
    });

    it('should return manager queries when role is MANAGER', async () => {
      const mockQueries = [{ id: 'q1' }];
      (QueryService.getQueriesForManager as jest.Mock).mockResolvedValue(mockQueries);

      mockRequest = {
        user: { id: 'manager-1', email: 'manager@test.com', role: 'MANAGER' },
        query: {}
      };

      await QueryController.getQueries(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(QueryService.getQueriesForManager).toHaveBeenCalledWith('manager-1', undefined, undefined);
    });

    it('should return manager queries with type filter', async () => {
      const mockQueries = [{ id: 'q1' }];
      (QueryService.getQueriesForManager as jest.Mock).mockResolvedValue(mockQueries);

      mockRequest = {
        user: { id: 'manager-1', email: 'manager@test.com', role: 'MANAGER' },
        query: { type: 'MONGODB' }
      };

      await QueryController.getQueries(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(QueryService.getQueriesForManager).toHaveBeenCalledWith('manager-1', undefined, 'MONGODB');
    });

    it('should return all queries when role is ADMIN', async () => {
      const mockQueries = [{ id: 'q1' }, { id: 'q2' }];
      (QueryService.getAllQueries as jest.Mock).mockResolvedValue(mockQueries);

      mockRequest = {
        user: { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' },
        query: {}
      };

      await QueryController.getQueries(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(QueryService.getAllQueries).toHaveBeenCalledWith(undefined, undefined);
      expect(jsonMock).toHaveBeenCalledWith(mockQueries);
    });

    it('should return all queries with status filter for ADMIN', async () => {
      const mockQueries = [{ id: 'q1', status: 'PENDING' }];
      (QueryService.getAllQueries as jest.Mock).mockResolvedValue(mockQueries);

      mockRequest = {
        user: { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' },
        query: { status: 'PENDING' }
      };

      await QueryController.getQueries(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(QueryService.getAllQueries).toHaveBeenCalledWith(['PENDING'], undefined);
    });

    it('should return all queries with type filter for ADMIN', async () => {
      const mockQueries = [{ id: 'q1' }];
      (QueryService.getAllQueries as jest.Mock).mockResolvedValue(mockQueries);

      mockRequest = {
        user: { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' },
        query: { type: 'POSTGRES' }
      };

      await QueryController.getQueries(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(QueryService.getAllQueries).toHaveBeenCalledWith(undefined, 'POSTGRES');
    });

    it('should return own queries for ADMIN when user=me', async () => {
      const mockQueries = [{ id: 'q1' }];
      (QueryService.getQueriesByUser as jest.Mock).mockResolvedValue(mockQueries);

      mockRequest = {
        user: { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' },
        query: { user: 'me' }
      };

      await QueryController.getQueries(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(QueryService.getQueriesByUser).toHaveBeenCalledWith('admin-1', undefined, undefined);
    });

    it('should return own queries for DEVELOPER', async () => {
      const mockQueries = [{ id: 'q1' }];
      (QueryService.getQueriesByUser as jest.Mock).mockResolvedValue(mockQueries);

      mockRequest = {
        user: { id: 'dev-1', email: 'dev@test.com', role: 'DEVELOPER' },
        query: {}
      };

      await QueryController.getQueries(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(QueryService.getQueriesByUser).toHaveBeenCalledWith('dev-1', undefined, undefined);
    });

    it('should return 500 on error', async () => {
      (QueryService.getQueriesByUser as jest.Mock).mockRejectedValue(new Error('DB error'));

      mockRequest = {
        user: { id: 'user-1', email: 'test@test.com', role: 'DEVELOPER' },
        query: { user: 'me' }
      };

      await QueryController.getQueries(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });
});
