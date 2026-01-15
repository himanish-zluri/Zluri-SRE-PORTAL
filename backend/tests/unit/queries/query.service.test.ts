import { QueryService } from '../../../src/modules/queries/query.service';
import { QueryRepository } from '../../../src/modules/queries/query.repository';
import { DbInstanceRepository } from '../../../src/modules/db-instances/dbInstance.repository';
import { AuditRepository } from '../../../src/modules/audit/audit.repository';
import { executePostgresQuery } from '../../../src/execution/postgres-query.executor';
import { executePostgresScriptSandboxed, executeMongoScriptSandboxed } from '../../../src/execution/sandbox/executor';
import { executeMongoQuery } from '../../../src/execution/mongo-query.executor';
import fs from 'fs';

jest.mock('../../../src/modules/queries/query.repository');
jest.mock('../../../src/modules/db-instances/dbInstance.repository');
jest.mock('../../../src/modules/audit/audit.repository');
jest.mock('../../../src/execution/postgres-query.executor');
jest.mock('../../../src/execution/sandbox/executor');
jest.mock('../../../src/execution/mongo-query.executor');
jest.mock('fs');

describe('QueryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AuditRepository.log as jest.Mock).mockResolvedValue(undefined);
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

      const mockCreated = { id: 'query-1', ...input, status: 'PENDING' };
      (QueryRepository.create as jest.Mock).mockResolvedValue(mockCreated);

      const result = await QueryService.submitQuery(input);

      expect(QueryRepository.create).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockCreated);
    });

    it('should create a script submission with scriptPath', async () => {
      const input = {
        requesterId: 'user-123',
        instanceId: 'instance-1',
        databaseName: 'test_db',
        queryText: '',
        podId: 'pod-a',
        comments: 'Test script',
        submissionType: 'SCRIPT' as const,
        scriptPath: '/uploads/script.js'
      };

      (QueryRepository.create as jest.Mock).mockResolvedValue({ id: 'query-1', ...input });

      await QueryService.submitQuery(input);

      expect(QueryRepository.create).toHaveBeenCalledWith(input);
    });
  });

  describe('approveQuery', () => {
    const mockQuery = {
      id: 'query-1',
      instance_id: 'instance-1',
      database_name: 'test_db',
      query_text: 'SELECT * FROM users',
      submission_type: 'QUERY',
      status: 'PENDING',
      pod_id: 'pod-a'
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
      const scriptQuery = { ...mockQuery, submission_type: 'SCRIPT', script_path: '/path/to/script.js' };
      (QueryRepository.findById as jest.Mock).mockResolvedValue(scriptQuery);
      (DbInstanceRepository.findById as jest.Mock).mockResolvedValue(mockPostgresInstance);
      (executePostgresScriptSandboxed as jest.Mock).mockResolvedValue({ stdout: 'success', stderr: '' });

      await QueryService.approveQuery('query-1', 'manager-1');

      expect(executePostgresScriptSandboxed).toHaveBeenCalledWith('/path/to/script.js', expect.objectContaining({
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
      const mongoQuery = { ...mockQuery, instance_id: 'instance-2' };

      (QueryRepository.findById as jest.Mock).mockResolvedValue(mongoQuery);
      (DbInstanceRepository.findById as jest.Mock).mockResolvedValue(mongoInstance);
      (executeMongoQuery as jest.Mock).mockResolvedValue([{ _id: '1' }]);

      await QueryService.approveQuery('query-1', 'manager-1');

      expect(executeMongoQuery).toHaveBeenCalledWith('mongodb://localhost:27017', 'test_db', mockQuery.query_text);
    });

    it('should execute mongodb script', async () => {
      const mongoInstance = {
        id: 'instance-2',
        type: 'MONGODB',
        mongo_uri: 'mongodb://localhost:27017'
      };
      const mongoScriptQuery = { 
        ...mockQuery, 
        instance_id: 'instance-2', 
        submission_type: 'SCRIPT',
        script_path: '/path/to/mongo-script.js'
      };

      (QueryRepository.findById as jest.Mock).mockResolvedValue(mongoScriptQuery);
      (DbInstanceRepository.findById as jest.Mock).mockResolvedValue(mongoInstance);
      (executeMongoScriptSandboxed as jest.Mock).mockResolvedValue([{ result: 'ok' }]);

      await QueryService.approveQuery('query-1', 'manager-1');

      expect(executeMongoScriptSandboxed).toHaveBeenCalledWith('/path/to/mongo-script.js', 'mongodb://localhost:27017', 'test_db');
    });

    it('should throw error when mongo_uri not configured', async () => {
      const mongoInstance = { id: 'instance-2', type: 'MONGODB', mongo_uri: null };
      (QueryRepository.findById as jest.Mock).mockResolvedValue({ ...mockQuery, instance_id: 'instance-2' });
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

    it('should throw error when postgres script path missing', async () => {
      const scriptQuery = { ...mockQuery, submission_type: 'SCRIPT', script_path: null };
      (QueryRepository.findById as jest.Mock).mockResolvedValue(scriptQuery);
      (DbInstanceRepository.findById as jest.Mock).mockResolvedValue(mockPostgresInstance);

      await expect(QueryService.approveQuery('query-1', 'manager-1'))
        .rejects.toThrow('Postgres script path missing');
    });

    it('should throw error when mongo script path missing', async () => {
      const mongoInstance = { id: 'instance-2', type: 'MONGODB', mongo_uri: 'mongodb://localhost' };
      const scriptQuery = { ...mockQuery, instance_id: 'instance-2', submission_type: 'SCRIPT', script_path: null };
      
      (QueryRepository.findById as jest.Mock).mockResolvedValue(scriptQuery);
      (DbInstanceRepository.findById as jest.Mock).mockResolvedValue(mongoInstance);

      await expect(QueryService.approveQuery('query-1', 'manager-1'))
        .rejects.toThrow('Mongo script path missing');
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
  });

  describe('rejectQuery', () => {
    it('should reject query with reason as MANAGER', async () => {
      const mockQuery = { id: 'query-1', pod_id: 'pod-a', status: 'PENDING' };
      (QueryRepository.findById as jest.Mock).mockResolvedValue(mockQuery);
      (QueryRepository.isManagerOfPod as jest.Mock).mockResolvedValue(true);
      (QueryRepository.reject as jest.Mock).mockResolvedValue({ ...mockQuery, status: 'REJECTED' });

      const result = await QueryService.rejectQuery('query-1', 'manager-1', 'MANAGER', 'Not approved');

      expect(QueryRepository.reject).toHaveBeenCalledWith('query-1', 'manager-1', 'Not approved');
    });

    it('should reject query without reason', async () => {
      const mockQuery = { id: 'query-1', pod_id: 'pod-a' };
      (QueryRepository.findById as jest.Mock).mockResolvedValue(mockQuery);
      (QueryRepository.isManagerOfPod as jest.Mock).mockResolvedValue(true);
      (QueryRepository.reject as jest.Mock).mockResolvedValue({ ...mockQuery, status: 'REJECTED' });

      await QueryService.rejectQuery('query-1', 'manager-1', 'MANAGER');

      expect(QueryRepository.reject).toHaveBeenCalledWith('query-1', 'manager-1', undefined);
    });

    it('should allow ADMIN to reject any query without POD check', async () => {
      const mockQuery = { id: 'query-1', pod_id: 'pod-a' };
      (QueryRepository.findById as jest.Mock).mockResolvedValue(mockQuery);
      (QueryRepository.reject as jest.Mock).mockResolvedValue({ ...mockQuery, status: 'REJECTED' });

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
      const mockQuery = { id: 'query-1', pod_id: 'pod-a' };
      (QueryRepository.findById as jest.Mock).mockResolvedValue(mockQuery);
      (QueryRepository.isManagerOfPod as jest.Mock).mockResolvedValue(false);

      await expect(QueryService.rejectQuery('query-1', 'manager-1', 'MANAGER'))
        .rejects.toThrow('Not authorized to reject this request');
    });
  });

  describe('getQueriesByUser', () => {
    beforeEach(() => {
      (QueryRepository.countByRequester as jest.Mock).mockResolvedValue(2);
    });

    it('should return queries for user with script content and pagination', async () => {
      const mockQueries = [
        { id: 'q1', submission_type: 'QUERY', script_path: null },
        { id: 'q2', submission_type: 'SCRIPT', script_path: '/path/to/script.js' }
      ];
      (QueryRepository.findByRequesterWithStatus as jest.Mock).mockResolvedValue(mockQueries);
      (fs.readFileSync as jest.Mock).mockReturnValue('console.log("script content");');

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

    it('should handle missing script file gracefully', async () => {
      const mockQueries = [{ id: 'q1', submission_type: 'SCRIPT', script_path: '/missing/file.js' }];
      (QueryRepository.findByRequesterWithStatus as jest.Mock).mockResolvedValue(mockQueries);
      (QueryRepository.countByRequester as jest.Mock).mockResolvedValue(1);
      (fs.readFileSync as jest.Mock).mockImplementation(() => { throw new Error('File not found'); });

      const result = await QueryService.getQueriesByUser('user-1');

      expect(result.data[0].script_content).toBeNull();
    });

    it('should return null script_content for SCRIPT type with null script_path', async () => {
      const mockQueries = [{ id: 'q1', submission_type: 'SCRIPT', script_path: null }];
      (QueryRepository.findByRequesterWithStatus as jest.Mock).mockResolvedValue(mockQueries);
      (QueryRepository.countByRequester as jest.Mock).mockResolvedValue(1);

      const result = await QueryService.getQueriesByUser('user-1');

      expect(result.data[0].script_content).toBeNull();
      expect(fs.readFileSync).not.toHaveBeenCalled();
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
      const mockQueries = [{ id: 'q1', submission_type: 'SCRIPT', script_path: '/path/script.js' }];
      (QueryRepository.findByManagerWithStatus as jest.Mock).mockResolvedValue(mockQueries);
      (fs.readFileSync as jest.Mock).mockReturnValue('// manager script');

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
        { id: 'q1', submission_type: 'QUERY' },
        { id: 'q2', submission_type: 'SCRIPT', script_path: '/path/script.js' }
      ];
      (QueryRepository.findAllWithStatus as jest.Mock).mockResolvedValue(mockQueries);
      (fs.readFileSync as jest.Mock).mockReturnValue('// all queries script');

      const result = await QueryService.getAllQueries();

      expect(QueryRepository.findAllWithStatus).toHaveBeenCalledWith(undefined, undefined, undefined);
      expect(result.data[0].script_content).toBeNull();
      expect(result.data[1].script_content).toBe('// all queries script');
    });

    it('should return all queries with status filter', async () => {
      const mockQueries = [{ id: 'q1', status: 'PENDING', submission_type: 'QUERY' }];
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
});
