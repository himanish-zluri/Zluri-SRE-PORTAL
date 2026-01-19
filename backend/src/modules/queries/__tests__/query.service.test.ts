import { QueryService } from '../query.service';
import { QueryRepository } from '../query.repository';
import { DbInstanceRepository } from '../../db-instances/dbInstance.repository';
import { AuditRepository } from '../../audit/audit.repository';
import { executePostgresQuery } from '../../../execution/postgres-query.executor';
import { executePostgresScriptSandboxed, executeMongoScriptSandboxed } from '../../../execution/sandbox/executor';
import { executeMongoQuery } from '../../../execution/mongo-query.executor';
import { SlackService } from '../../../services/slack.service';
import { UserRepository } from '../../users/user.repository';

jest.mock('../query.repository');
jest.mock('../../db-instances/dbInstance.repository');
jest.mock('../../audit/audit.repository');
jest.mock('../../../execution/postgres-query.executor');
jest.mock('../../../execution/sandbox/executor');
jest.mock('../../../execution/mongo-query.executor');
jest.mock('../../../services/slack.service');
jest.mock('../../users/user.repository');

describe('QueryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AuditRepository.log as jest.Mock).mockResolvedValue(undefined);
    (SlackService.notifyNewSubmission as jest.Mock).mockResolvedValue(undefined);
    (SlackService.notifyExecutionSuccess as jest.Mock).mockResolvedValue(undefined);
    (SlackService.notifyExecutionFailure as jest.Mock).mockResolvedValue(undefined);
    (SlackService.notifyRejection as jest.Mock).mockResolvedValue(undefined);
    (UserRepository.findById as jest.Mock).mockResolvedValue({ id: 'manager-1', name: 'Manager' });
  });

  describe('submitQuery', () => {
    it('should create a new query request', async () => {
      const input = {
        requesterId: 'user-123',
        instanceId: 'instance-1',
        databaseName: 'test_db',
        queryText: 'SELECT * FROM users',
        podId: 'pod-a',
        comments: 'Test query',
        submissionType: 'QUERY' as const
      };

      const mockCreated = { 
        id: 'query-1', 
        requester: { id: 'user-123' },
        instance: { id: 'instance-1' },
        pod: { id: 'pod-a' },
        databaseName: 'test_db',
        queryText: 'SELECT * FROM users',
        comments: 'Test query',
        submissionType: 'QUERY',
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      (QueryRepository.create as jest.Mock).mockResolvedValue(mockCreated);

      const result = await QueryService.submitQuery(input);

      expect(QueryRepository.create).toHaveBeenCalledWith(input);
      expect(result.id).toBe('query-1');
      expect(result.status).toBe('PENDING');
    });

    it('should create a script submission with scriptContent', async () => {
      const input = {
        requesterId: 'user-123',
        instanceId: 'instance-1',
        databaseName: 'test_db',
        queryText: '',
        podId: 'pod-a',
        comments: 'Test script',
        submissionType: 'SCRIPT' as const,
        scriptContent: 'console.log("hello");'
      };

      const mockCreated = {
        id: 'query-1',
        requester: { id: 'user-123' },
        instance: { id: 'instance-1' },
        pod: { id: 'pod-a' },
        databaseName: 'test_db',
        queryText: '[SCRIPT SUBMISSION]',
        comments: 'Test script',
        submissionType: 'SCRIPT',
        scriptContent: 'console.log("hello");',
        status: 'PENDING'
      };
      (QueryRepository.create as jest.Mock).mockResolvedValue(mockCreated);

      await QueryService.submitQuery(input);

      expect(QueryRepository.create).toHaveBeenCalledWith(input);
    });

    it('should handle Slack notification failure gracefully on submit', async () => {
      const input = {
        requesterId: 'user-123',
        instanceId: 'instance-1',
        databaseName: 'test_db',
        queryText: 'SELECT * FROM users',
        podId: 'pod-a',
        comments: 'Test query',
        submissionType: 'QUERY' as const
      };

      const mockCreated = { 
        id: 'query-1', 
        requester: { id: 'user-123' },
        instance: { id: 'instance-1' },
        pod: { id: 'pod-a' },
        databaseName: 'test_db',
        queryText: 'SELECT * FROM users',
        comments: 'Test query',
        submissionType: 'QUERY',
        status: 'PENDING'
      };
      (QueryRepository.create as jest.Mock).mockResolvedValue(mockCreated);
      (SlackService.notifyNewSubmission as jest.Mock).mockRejectedValue(new Error('Slack API error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Should not throw even if Slack fails
      const result = await QueryService.submitQuery(input);

      expect(result.id).toBe('query-1');
      expect(consoleSpy).toHaveBeenCalledWith('Slack notification failed:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('approveQuery', () => {
    const mockQuery = {
      id: 'query-1',
      instance: { id: 'instance-1' },
      databaseName: 'test_db',
      queryText: 'SELECT * FROM users',
      submissionType: 'QUERY',
      status: 'PENDING',
      pod: { id: 'pod-a' }
    };

    const mockPostgresInstance = {
      id: 'instance-1',
      type: 'POSTGRES',
      host: 'localhost',
      port: 5432,
      username: 'user',
      password: 'pass'
    };

    it('should execute postgres query and mark as executed', async () => {
      (QueryRepository.findById as jest.Mock).mockResolvedValue(mockQuery);
      (DbInstanceRepository.findById as jest.Mock).mockResolvedValue(mockPostgresInstance);
      (executePostgresQuery as jest.Mock).mockResolvedValue({ rows: [{ id: 1 }] });

      const result = await QueryService.approveQuery('query-1', 'manager-1');

      expect(executePostgresQuery).toHaveBeenCalled();
      expect(QueryRepository.markExecuted).toHaveBeenCalledWith('query-1', 'manager-1', { rows: [{ id: 1 }] });
      expect(result.status).toBe('EXECUTED');
    });

    it('should execute postgres script', async () => {
      const scriptQuery = { ...mockQuery, submissionType: 'SCRIPT', scriptContent: 'const result = await query("SELECT 1");' };
      (QueryRepository.findById as jest.Mock).mockResolvedValue(scriptQuery);
      (DbInstanceRepository.findById as jest.Mock).mockResolvedValue(mockPostgresInstance);
      (executePostgresScriptSandboxed as jest.Mock).mockResolvedValue({ stdout: 'success', stderr: '' });

      await QueryService.approveQuery('query-1', 'manager-1');

      expect(executePostgresScriptSandboxed).toHaveBeenCalledWith('const result = await query("SELECT 1");', expect.objectContaining({
        PG_HOST: 'localhost',
        PG_DATABASE: 'test_db'
      }));
    });

    it('should throw error when query not found', async () => {
      (QueryRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(QueryService.approveQuery('invalid-id', 'manager-1'))
        .rejects.toThrow('Query not found');
    });

    it('should throw error when query already processed', async () => {
      (QueryRepository.findById as jest.Mock).mockResolvedValue({ ...mockQuery, status: 'APPROVED' });

      await expect(QueryService.approveQuery('query-1', 'manager-1'))
        .rejects.toThrow('Query already processed');
    });

    it('should throw error when db instance not found', async () => {
      (QueryRepository.findById as jest.Mock).mockResolvedValue(mockQuery);
      (DbInstanceRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(QueryService.approveQuery('query-1', 'manager-1'))
        .rejects.toThrow('DB instance not found');
    });

    it('should mark as failed on execution error', async () => {
      (QueryRepository.findById as jest.Mock).mockResolvedValue(mockQuery);
      (DbInstanceRepository.findById as jest.Mock).mockResolvedValue(mockPostgresInstance);
      (executePostgresQuery as jest.Mock).mockRejectedValue(new Error('Query failed'));

      await expect(QueryService.approveQuery('query-1', 'manager-1'))
        .rejects.toThrow('Query failed');

      expect(QueryRepository.markFailed).toHaveBeenCalledWith('query-1', 'manager-1', 'Query failed');
    });

    it('should execute mongodb query', async () => {
      const mongoInstance = {
        id: 'instance-2',
        type: 'MONGODB',
        mongo_uri: 'mongodb://localhost:27017'
      };
      const mongoQuery = { ...mockQuery, instance: { id: 'instance-2' } };

      (QueryRepository.findById as jest.Mock).mockResolvedValue(mongoQuery);
      (DbInstanceRepository.findById as jest.Mock).mockResolvedValue(mongoInstance);
      (executeMongoQuery as jest.Mock).mockResolvedValue([{ _id: '1' }]);

      await QueryService.approveQuery('query-1', 'manager-1');

      expect(executeMongoQuery).toHaveBeenCalledWith('mongodb://localhost:27017', 'test_db', mockQuery.queryText);
    });

    it('should execute mongodb script', async () => {
      const mongoInstance = {
        id: 'instance-2',
        type: 'MONGODB',
        mongo_uri: 'mongodb://localhost:27017'
      };
      const mongoScriptQuery = { 
        ...mockQuery, 
        instance: { id: 'instance-2' }, 
        submissionType: 'SCRIPT',
        scriptContent: 'return await db.collection("users").find({}).toArray();'
      };

      (QueryRepository.findById as jest.Mock).mockResolvedValue(mongoScriptQuery);
      (DbInstanceRepository.findById as jest.Mock).mockResolvedValue(mongoInstance);
      (executeMongoScriptSandboxed as jest.Mock).mockResolvedValue([{ result: 'ok' }]);

      await QueryService.approveQuery('query-1', 'manager-1');

      expect(executeMongoScriptSandboxed).toHaveBeenCalledWith(
        'return await db.collection("users").find({}).toArray();', 
        'mongodb://localhost:27017', 
        'test_db'
      );
    });

    it('should throw error when mongo_uri not configured', async () => {
      const mongoInstance = { id: 'instance-2', type: 'MONGODB', mongo_uri: null };
      (QueryRepository.findById as jest.Mock).mockResolvedValue({ ...mockQuery, instance: { id: 'instance-2' } });
      (DbInstanceRepository.findById as jest.Mock).mockResolvedValue(mongoInstance);

      await expect(QueryService.approveQuery('query-1', 'manager-1'))
        .rejects.toThrow('Mongo URI not configured');
    });

    it('should throw error for unsupported database type', async () => {
      const unknownInstance = { id: 'instance-3', type: 'MYSQL' };
      (QueryRepository.findById as jest.Mock).mockResolvedValue(mockQuery);
      (DbInstanceRepository.findById as jest.Mock).mockResolvedValue(unknownInstance);

      await expect(QueryService.approveQuery('query-1', 'manager-1'))
        .rejects.toThrow('Unsupported database type: MYSQL');
    });

    it('should throw error when postgres script content missing', async () => {
      const scriptQuery = { ...mockQuery, submissionType: 'SCRIPT', scriptContent: null };
      (QueryRepository.findById as jest.Mock).mockResolvedValue(scriptQuery);
      (DbInstanceRepository.findById as jest.Mock).mockResolvedValue(mockPostgresInstance);

      await expect(QueryService.approveQuery('query-1', 'manager-1'))
        .rejects.toThrow('Script content missing');
    });

    it('should throw error when mongo script content missing', async () => {
      const mongoInstance = { id: 'instance-2', type: 'MONGODB', mongo_uri: 'mongodb://localhost' };
      const scriptQuery = { ...mockQuery, instance: { id: 'instance-2' }, submissionType: 'SCRIPT', scriptContent: null };
      
      (QueryRepository.findById as jest.Mock).mockResolvedValue(scriptQuery);
      (DbInstanceRepository.findById as jest.Mock).mockResolvedValue(mongoInstance);

      await expect(QueryService.approveQuery('query-1', 'manager-1'))
        .rejects.toThrow('Script content missing');
    });

    it('should throw error when postgres instance missing host', async () => {
      const incompleteInstance = { ...mockPostgresInstance, host: null };
      (QueryRepository.findById as jest.Mock).mockResolvedValue(mockQuery);
      (DbInstanceRepository.findById as jest.Mock).mockResolvedValue(incompleteInstance);

      await expect(QueryService.approveQuery('query-1', 'manager-1'))
        .rejects.toThrow('Postgres instance missing required connection details');
    });

    it('should throw error when postgres instance missing port', async () => {
      const incompleteInstance = { ...mockPostgresInstance, port: null };
      (QueryRepository.findById as jest.Mock).mockResolvedValue(mockQuery);
      (DbInstanceRepository.findById as jest.Mock).mockResolvedValue(incompleteInstance);

      await expect(QueryService.approveQuery('query-1', 'manager-1'))
        .rejects.toThrow('Postgres instance missing required connection details');
    });

    it('should throw error when postgres instance missing username', async () => {
      const incompleteInstance = { ...mockPostgresInstance, username: null };
      (QueryRepository.findById as jest.Mock).mockResolvedValue(mockQuery);
      (DbInstanceRepository.findById as jest.Mock).mockResolvedValue(incompleteInstance);

      await expect(QueryService.approveQuery('query-1', 'manager-1'))
        .rejects.toThrow('Postgres instance missing required connection details');
    });

    it('should throw error when postgres instance missing password', async () => {
      const incompleteInstance = { ...mockPostgresInstance, password: null };
      (QueryRepository.findById as jest.Mock).mockResolvedValue(mockQuery);
      (DbInstanceRepository.findById as jest.Mock).mockResolvedValue(incompleteInstance);

      await expect(QueryService.approveQuery('query-1', 'manager-1'))
        .rejects.toThrow('Postgres instance missing required connection details');
    });

    it('should handle Slack success notification failure gracefully', async () => {
      (QueryRepository.findById as jest.Mock).mockResolvedValue(mockQuery);
      (DbInstanceRepository.findById as jest.Mock).mockResolvedValue(mockPostgresInstance);
      (executePostgresQuery as jest.Mock).mockResolvedValue({ rows: [{ id: 1 }] });
      (SlackService.notifyExecutionSuccess as jest.Mock).mockRejectedValue(new Error('Slack API error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Should not throw even if Slack fails
      const result = await QueryService.approveQuery('query-1', 'manager-1');

      expect(result.status).toBe('EXECUTED');
      expect(consoleSpy).toHaveBeenCalledWith('Slack notification failed:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should handle Slack failure notification failure gracefully', async () => {
      (QueryRepository.findById as jest.Mock).mockResolvedValue(mockQuery);
      (DbInstanceRepository.findById as jest.Mock).mockResolvedValue(mockPostgresInstance);
      (executePostgresQuery as jest.Mock).mockRejectedValue(new Error('Query failed'));
      (SlackService.notifyExecutionFailure as jest.Mock).mockRejectedValue(new Error('Slack API error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Should still throw the original error
      await expect(QueryService.approveQuery('query-1', 'manager-1'))
        .rejects.toThrow('Query failed');

      expect(consoleSpy).toHaveBeenCalledWith('Slack notification failed:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('rejectQuery', () => {
    it('should reject query with reason as MANAGER', async () => {
      const mockQuery = { id: 'query-1', pod: { id: 'pod-a' }, status: 'PENDING' };
      const mockRejected = { ...mockQuery, status: 'REJECTED' };
      (QueryRepository.findById as jest.Mock).mockResolvedValue(mockQuery);
      (QueryRepository.isManagerOfPod as jest.Mock).mockResolvedValue(true);
      (QueryRepository.reject as jest.Mock).mockResolvedValue(mockRejected);

      await QueryService.rejectQuery('query-1', 'manager-1', 'MANAGER', 'Not approved');

      expect(QueryRepository.reject).toHaveBeenCalledWith('query-1', 'manager-1', 'Not approved');
    });

    it('should reject query without reason', async () => {
      const mockQuery = { id: 'query-1', pod: { id: 'pod-a' } };
      const mockRejected = { ...mockQuery, status: 'REJECTED' };
      (QueryRepository.findById as jest.Mock).mockResolvedValue(mockQuery);
      (QueryRepository.isManagerOfPod as jest.Mock).mockResolvedValue(true);
      (QueryRepository.reject as jest.Mock).mockResolvedValue(mockRejected);

      await QueryService.rejectQuery('query-1', 'manager-1', 'MANAGER');

      expect(QueryRepository.reject).toHaveBeenCalledWith('query-1', 'manager-1', undefined);
    });

    it('should allow ADMIN to reject any query without POD check', async () => {
      const mockQuery = { id: 'query-1', pod: { id: 'pod-a' } };
      const mockRejected = { ...mockQuery, status: 'REJECTED' };
      (QueryRepository.findById as jest.Mock).mockResolvedValue(mockQuery);
      (QueryRepository.reject as jest.Mock).mockResolvedValue(mockRejected);

      await QueryService.rejectQuery('query-1', 'admin-1', 'ADMIN', 'Admin rejection');

      expect(QueryRepository.isManagerOfPod).not.toHaveBeenCalled();
      expect(QueryRepository.reject).toHaveBeenCalledWith('query-1', 'admin-1', 'Admin rejection');
    });

    it('should throw error when query not found', async () => {
      (QueryRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(QueryService.rejectQuery('invalid-id', 'manager-1', 'MANAGER'))
        .rejects.toThrow('Query not found');
    });

    it('should throw error when manager not authorized', async () => {
      const mockQuery = { id: 'query-1', pod: { id: 'pod-a' } };
      (QueryRepository.findById as jest.Mock).mockResolvedValue(mockQuery);
      (QueryRepository.isManagerOfPod as jest.Mock).mockResolvedValue(false);

      await expect(QueryService.rejectQuery('query-1', 'manager-1', 'MANAGER'))
        .rejects.toThrow('Not authorized to reject this request');
    });

    it('should handle Slack rejection notification failure gracefully', async () => {
      const mockQuery = { id: 'query-1', pod: { id: 'pod-a' }, status: 'PENDING' };
      const mockRejected = { ...mockQuery, status: 'REJECTED' };
      (QueryRepository.findById as jest.Mock).mockResolvedValue(mockQuery);
      (QueryRepository.isManagerOfPod as jest.Mock).mockResolvedValue(true);
      (QueryRepository.reject as jest.Mock).mockResolvedValue(mockRejected);
      (SlackService.notifyRejection as jest.Mock).mockRejectedValue(new Error('Slack API error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Should not throw even if Slack fails
      const result = await QueryService.rejectQuery('query-1', 'manager-1', 'MANAGER', 'Not approved');

      expect(result.status).toBe('REJECTED');
      expect(consoleSpy).toHaveBeenCalledWith('Slack notification failed:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('getQueriesByUser', () => {
    beforeEach(() => {
      (QueryRepository.countByRequester as jest.Mock).mockResolvedValue(2);
    });

    it('should return queries for user with script content and pagination', async () => {
      const mockQueries = [
        { id: 'q1', submissionType: 'QUERY', scriptContent: null },
        { id: 'q2', submissionType: 'SCRIPT', scriptContent: 'console.log("script content");' }
      ];
      (QueryRepository.findByRequesterWithStatus as jest.Mock).mockResolvedValue(mockQueries);

      const result = await QueryService.getQueriesByUser('user-1');

      expect(QueryRepository.findByRequesterWithStatus).toHaveBeenCalledWith('user-1', undefined, undefined, undefined);
      expect(result.data[0].script_content).toBeNull();
      expect(result.data[1].script_content).toBe('console.log("script content");');
      expect(result.pagination.total).toBe(2);
    });

    it('should return queries with status filter', async () => {
      (QueryRepository.findByRequesterWithStatus as jest.Mock).mockResolvedValue([]);
      (QueryRepository.countByRequester as jest.Mock).mockResolvedValue(0);

      await QueryService.getQueriesByUser('user-1', ['PENDING', 'APPROVED']);

      expect(QueryRepository.findByRequesterWithStatus).toHaveBeenCalledWith('user-1', ['PENDING', 'APPROVED'], undefined, undefined);
    });

    it('should return queries with type filter', async () => {
      (QueryRepository.findByRequesterWithStatus as jest.Mock).mockResolvedValue([]);
      (QueryRepository.countByRequester as jest.Mock).mockResolvedValue(0);

      await QueryService.getQueriesByUser('user-1', undefined, 'POSTGRES');

      expect(QueryRepository.findByRequesterWithStatus).toHaveBeenCalledWith('user-1', undefined, 'POSTGRES', undefined);
    });

    it('should return queries with both status and type filter', async () => {
      (QueryRepository.findByRequesterWithStatus as jest.Mock).mockResolvedValue([]);
      (QueryRepository.countByRequester as jest.Mock).mockResolvedValue(0);

      await QueryService.getQueriesByUser('user-1', ['PENDING'], 'MONGODB');

      expect(QueryRepository.findByRequesterWithStatus).toHaveBeenCalledWith('user-1', ['PENDING'], 'MONGODB', undefined);
    });

    it('should return queries with pagination options', async () => {
      (QueryRepository.findByRequesterWithStatus as jest.Mock).mockResolvedValue([{ id: 'q1' }]);
      (QueryRepository.countByRequester as jest.Mock).mockResolvedValue(25);

      const result = await QueryService.getQueriesByUser('user-1', undefined, undefined, { limit: 10, offset: 10 });

      expect(QueryRepository.findByRequesterWithStatus).toHaveBeenCalledWith('user-1', undefined, undefined, { limit: 10, offset: 10 });
      expect(result.pagination).toEqual({ total: 25, limit: 10, offset: 10, hasMore: true });
    });
  });

  describe('getQueriesForManager', () => {
    beforeEach(() => {
      (QueryRepository.countByManager as jest.Mock).mockResolvedValue(1);
    });

    it('should return queries for manager pods with script content', async () => {
      const mockQueries = [{ id: 'q1', submissionType: 'SCRIPT', scriptContent: '// manager script' }];
      (QueryRepository.findByManagerWithStatus as jest.Mock).mockResolvedValue(mockQueries);

      const result = await QueryService.getQueriesForManager('manager-1', ['PENDING']);

      expect(QueryRepository.findByManagerWithStatus).toHaveBeenCalledWith('manager-1', ['PENDING'], undefined, undefined);
      expect(result.data[0].script_content).toBe('// manager script');
    });

    it('should return queries with type filter', async () => {
      (QueryRepository.findByManagerWithStatus as jest.Mock).mockResolvedValue([]);
      (QueryRepository.countByManager as jest.Mock).mockResolvedValue(0);

      await QueryService.getQueriesForManager('manager-1', undefined, 'POSTGRES');

      expect(QueryRepository.findByManagerWithStatus).toHaveBeenCalledWith('manager-1', undefined, 'POSTGRES', undefined);
    });

    it('should return queries with pagination options', async () => {
      (QueryRepository.findByManagerWithStatus as jest.Mock).mockResolvedValue([{ id: 'q1' }]);
      (QueryRepository.countByManager as jest.Mock).mockResolvedValue(50);

      const result = await QueryService.getQueriesForManager('manager-1', undefined, undefined, { limit: 10, offset: 20 });

      expect(QueryRepository.findByManagerWithStatus).toHaveBeenCalledWith('manager-1', undefined, undefined, { limit: 10, offset: 20 });
      expect(result.pagination).toEqual({ total: 50, limit: 10, offset: 20, hasMore: true });
    });
  });

  describe('getAllQueries', () => {
    beforeEach(() => {
      (QueryRepository.countAll as jest.Mock).mockResolvedValue(2);
    });

    it('should return all queries with script content', async () => {
      const mockQueries = [
        { id: 'q1', submissionType: 'QUERY' },
        { id: 'q2', submissionType: 'SCRIPT', scriptContent: '// all queries script' }
      ];
      (QueryRepository.findAllWithStatus as jest.Mock).mockResolvedValue(mockQueries);

      const result = await QueryService.getAllQueries();

      expect(QueryRepository.findAllWithStatus).toHaveBeenCalledWith(undefined, undefined, undefined);
      expect(result.data[1].script_content).toBe('// all queries script');
    });

    it('should return all queries with status filter', async () => {
      const mockQueries = [{ id: 'q1', status: 'PENDING', submissionType: 'QUERY' }];
      (QueryRepository.findAllWithStatus as jest.Mock).mockResolvedValue(mockQueries);
      (QueryRepository.countAll as jest.Mock).mockResolvedValue(1);

      const result = await QueryService.getAllQueries(['PENDING', 'APPROVED']);

      expect(QueryRepository.findAllWithStatus).toHaveBeenCalledWith(['PENDING', 'APPROVED'], undefined, undefined);
      expect(result.data).toHaveLength(1);
    });

    it('should return all queries with type filter', async () => {
      (QueryRepository.findAllWithStatus as jest.Mock).mockResolvedValue([]);
      (QueryRepository.countAll as jest.Mock).mockResolvedValue(0);

      await QueryService.getAllQueries(undefined, 'MONGODB');

      expect(QueryRepository.findAllWithStatus).toHaveBeenCalledWith(undefined, 'MONGODB', undefined);
    });

    it('should return queries with pagination options', async () => {
      (QueryRepository.findAllWithStatus as jest.Mock).mockResolvedValue([{ id: 'q1' }]);
      (QueryRepository.countAll as jest.Mock).mockResolvedValue(100);

      const result = await QueryService.getAllQueries(undefined, undefined, { limit: 10, offset: 0 });

      expect(QueryRepository.findAllWithStatus).toHaveBeenCalledWith(undefined, undefined, { limit: 10, offset: 0 });
      expect(result.pagination).toEqual({ total: 100, limit: 10, offset: 0, hasMore: true });
    });
  });

  describe('getQueryById', () => {
    const mockQuery = {
      id: 'query-123',
      requester: { id: 'user-1', name: 'User One', email: 'user@example.com' },
      pod: { id: 'pod-1', name: 'Pod A', manager: { name: 'Manager One' } },
      instance: { id: 'instance-1', name: 'DB Instance' },
      databaseName: 'test_db',
      submissionType: 'QUERY',
      queryText: 'SELECT * FROM users',
      comments: 'Test query',
      status: 'PENDING',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };

    it('should return query for admin user', async () => {
      (QueryRepository.findById as jest.Mock).mockResolvedValue(mockQuery);

      const result = await QueryService.getQueryById('query-123', 'admin-1', 'ADMIN');

      expect(QueryRepository.findById).toHaveBeenCalledWith('query-123');
      expect(result).toEqual(expect.objectContaining({
        id: 'query-123',
        requester_id: 'user-1',
        requester_name: 'User One',
        requester_email: 'user@example.com'
      }));
    });

    it('should return query for manager of the POD', async () => {
      (QueryRepository.findById as jest.Mock).mockResolvedValue(mockQuery);
      (UserRepository.getUserPods as jest.Mock).mockResolvedValue([
        { id: 'pod-1', name: 'Pod A' },
        { id: 'pod-2', name: 'Pod B' }
      ]);

      const result = await QueryService.getQueryById('query-123', 'manager-1', 'MANAGER');

      expect(QueryRepository.findById).toHaveBeenCalledWith('query-123');
      expect(UserRepository.getUserPods).toHaveBeenCalledWith('manager-1');
      expect(result).toEqual(expect.objectContaining({
        id: 'query-123',
        pod_id: 'pod-1'
      }));
    });

    it('should throw ForbiddenError for manager not owning the POD', async () => {
      (QueryRepository.findById as jest.Mock).mockResolvedValue(mockQuery);
      (UserRepository.getUserPods as jest.Mock).mockResolvedValue([
        { id: 'pod-2', name: 'Pod B' },
        { id: 'pod-3', name: 'Pod C' }
      ]);

      await expect(
        QueryService.getQueryById('query-123', 'manager-1', 'MANAGER')
      ).rejects.toThrow('You can only view queries for your PODs');

      expect(UserRepository.getUserPods).toHaveBeenCalledWith('manager-1');
    });

    it('should return query for the requester user', async () => {
      (QueryRepository.findById as jest.Mock).mockResolvedValue(mockQuery);

      const result = await QueryService.getQueryById('query-123', 'user-1', 'USER');

      expect(QueryRepository.findById).toHaveBeenCalledWith('query-123');
      expect(result).toEqual(expect.objectContaining({
        id: 'query-123',
        requester_id: 'user-1'
      }));
    });

    it('should throw ForbiddenError for non-requester user', async () => {
      (QueryRepository.findById as jest.Mock).mockResolvedValue(mockQuery);

      await expect(
        QueryService.getQueryById('query-123', 'other-user', 'USER')
      ).rejects.toThrow('You can only view your own queries');
    });

    it('should throw NotFoundError when query does not exist', async () => {
      (QueryRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        QueryService.getQueryById('nonexistent', 'user-1', 'ADMIN')
      ).rejects.toThrow('Query not found');

      expect(QueryRepository.findById).toHaveBeenCalledWith('nonexistent');
    });

    it('should handle query with missing pod information', async () => {
      const queryWithoutPod = { ...mockQuery, pod: null };
      (QueryRepository.findById as jest.Mock).mockResolvedValue(queryWithoutPod);
      (UserRepository.getUserPods as jest.Mock).mockResolvedValue([
        { id: 'pod-1', name: 'Pod A' }
      ]);

      await expect(
        QueryService.getQueryById('query-123', 'manager-1', 'MANAGER')
      ).rejects.toThrow('You can only view queries for your PODs');
    });

    it('should handle query with missing requester information', async () => {
      const queryWithoutRequester = { ...mockQuery, requester: null };
      (QueryRepository.findById as jest.Mock).mockResolvedValue(queryWithoutRequester);

      await expect(
        QueryService.getQueryById('query-123', 'user-1', 'USER')
      ).rejects.toThrow('You can only view your own queries');
    });
  });
});
