import { QueryService } from '../../../src/modules/queries/query.service';
import { QueryRepository } from '../../../src/modules/queries/query.repository';
import { DbInstanceRepository } from '../../../src/modules/db-instances/dbInstance.repository';
import { AuditRepository } from '../../../src/modules/audit/audit.repository';
import { executePostgresQuery } from '../../../src/execution/postgres.executor';
import { executeScript } from '../../../src/execution/script.executor';
import { executeMongoQuery } from '../../../src/execution/mongo.executor';
import { executeMongoScript } from '../../../src/execution/mongo-script.executor';

jest.mock('../../../src/modules/queries/query.repository');
jest.mock('../../../src/modules/db-instances/dbInstance.repository');
jest.mock('../../../src/modules/audit/audit.repository');
jest.mock('../../../src/execution/postgres.executor');
jest.mock('../../../src/execution/script.executor');
jest.mock('../../../src/execution/mongo.executor');
jest.mock('../../../src/execution/mongo-script.executor');

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
      (executeScript as jest.Mock).mockResolvedValue({ stdout: 'success', stderr: '' });

      await QueryService.approveQuery('query-1', 'manager-1');

      expect(executeScript).toHaveBeenCalledWith('/path/to/script.js', expect.objectContaining({
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
      (executeMongoScript as jest.Mock).mockResolvedValue([{ result: 'ok' }]);

      await QueryService.approveQuery('query-1', 'manager-1');

      expect(executeMongoScript).toHaveBeenCalledWith('/path/to/mongo-script.js', 'mongodb://localhost:27017', 'test_db');
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
  });

  describe('rejectQuery', () => {
    it('should reject query with reason', async () => {
      const mockQuery = { id: 'query-1', pod_id: 'pod-a', status: 'PENDING' };
      (QueryRepository.findById as jest.Mock).mockResolvedValue(mockQuery);
      (QueryRepository.isManagerOfPod as jest.Mock).mockResolvedValue(true);
      (QueryRepository.reject as jest.Mock).mockResolvedValue({ ...mockQuery, status: 'REJECTED' });

      const result = await QueryService.rejectQuery('query-1', 'manager-1', 'Not approved');

      expect(QueryRepository.reject).toHaveBeenCalledWith('query-1', 'manager-1', 'Not approved');
    });

    it('should reject query without reason', async () => {
      const mockQuery = { id: 'query-1', pod_id: 'pod-a' };
      (QueryRepository.findById as jest.Mock).mockResolvedValue(mockQuery);
      (QueryRepository.isManagerOfPod as jest.Mock).mockResolvedValue(true);
      (QueryRepository.reject as jest.Mock).mockResolvedValue({ ...mockQuery, status: 'REJECTED' });

      await QueryService.rejectQuery('query-1', 'manager-1');

      expect(QueryRepository.reject).toHaveBeenCalledWith('query-1', 'manager-1', undefined);
    });

    it('should throw error when query not found', async () => {
      (QueryRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(QueryService.rejectQuery('invalid-id', 'manager-1'))
        .rejects.toThrow('Query not found');
    });

    it('should throw error when manager not authorized', async () => {
      const mockQuery = { id: 'query-1', pod_id: 'pod-a' };
      (QueryRepository.findById as jest.Mock).mockResolvedValue(mockQuery);
      (QueryRepository.isManagerOfPod as jest.Mock).mockResolvedValue(false);

      await expect(QueryService.rejectQuery('query-1', 'manager-1'))
        .rejects.toThrow('Not authorized to reject this request');
    });
  });

  describe('getQueriesByUser', () => {
    it('should return queries for user', async () => {
      const mockQueries = [{ id: 'q1' }, { id: 'q2' }];
      (QueryRepository.findByRequesterWithStatus as jest.Mock).mockResolvedValue(mockQueries);

      const result = await QueryService.getQueriesByUser('user-1');

      expect(QueryRepository.findByRequesterWithStatus).toHaveBeenCalledWith('user-1', undefined);
      expect(result).toEqual(mockQueries);
    });

    it('should return queries with status filter', async () => {
      (QueryRepository.findByRequesterWithStatus as jest.Mock).mockResolvedValue([]);

      await QueryService.getQueriesByUser('user-1', ['PENDING', 'APPROVED']);

      expect(QueryRepository.findByRequesterWithStatus).toHaveBeenCalledWith('user-1', ['PENDING', 'APPROVED']);
    });
  });

  describe('getQueriesForManager', () => {
    it('should return queries for manager pods', async () => {
      const mockQueries = [{ id: 'q1' }];
      (QueryRepository.findByManagerWithStatus as jest.Mock).mockResolvedValue(mockQueries);

      const result = await QueryService.getQueriesForManager('manager-1', ['PENDING']);

      expect(QueryRepository.findByManagerWithStatus).toHaveBeenCalledWith('manager-1', ['PENDING']);
      expect(result).toEqual(mockQueries);
    });
  });

  describe('getAllQueries', () => {
    it('should return all queries', async () => {
      const mockQueries = [{ id: 'q1' }, { id: 'q2' }];
      (QueryRepository.findAllWithStatus as jest.Mock).mockResolvedValue(mockQueries);

      const result = await QueryService.getAllQueries();

      expect(QueryRepository.findAllWithStatus).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockQueries);
    });

    it('should return all queries with status filter', async () => {
      const mockQueries = [{ id: 'q1', status: 'PENDING' }];
      (QueryRepository.findAllWithStatus as jest.Mock).mockResolvedValue(mockQueries);

      const result = await QueryService.getAllQueries(['PENDING', 'APPROVED']);

      expect(QueryRepository.findAllWithStatus).toHaveBeenCalledWith(['PENDING', 'APPROVED']);
      expect(result).toEqual(mockQueries);
    });
  });
});
