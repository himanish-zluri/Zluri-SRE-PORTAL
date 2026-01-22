import { Pool } from 'pg';

jest.mock('pg', () => {
  const mockPool = {
    query: jest.fn(),
    end: jest.fn()
  };
  return { Pool: jest.fn(() => mockPool) };
});

import { executePostgresQuery } from '../../execution/postgres-query.executor';
import { QueryExecutionError, InternalError } from '../../errors';

describe('PostgresQueryExecutor', () => {
  let mockPool: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool = new Pool({} as any);
  });

  describe('executePostgresQuery', () => {
    const config = {
      host: 'localhost',
      port: 5432,
      username: 'user',
      password: 'pass',
      database: 'test_db'
    };

    it('should execute query and return rows', async () => {
      const mockRows = [{ id: 1, name: 'Test' }];
      mockPool.query.mockResolvedValue({ rows: mockRows, rowCount: 1 });
      mockPool.end.mockResolvedValue(undefined);

      const result = await executePostgresQuery(config, 'SELECT * FROM users');

      expect(Pool).toHaveBeenCalledWith({
        host: 'localhost',
        port: 5432,
        user: 'user',
        password: 'pass',
        database: 'test_db',
        ssl: { rejectUnauthorized: false },
        query_timeout: 30000
      });
      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM users');
      expect(mockPool.end).toHaveBeenCalled();
      expect(result).toEqual({ rows: mockRows, rowCount: 1 });
    });

    it('should close connection on error', async () => {
      mockPool.query.mockRejectedValue(new Error('Query failed'));
      mockPool.end.mockResolvedValue(undefined);

      await expect(executePostgresQuery(config, 'INVALID SQL'))
        .rejects.toThrow('Query failed');

      expect(mockPool.end).toHaveBeenCalled();
    });

    it('should handle query timeout', async () => {
      // Mock a query that takes longer than the timeout
      mockPool.query.mockImplementation(() => 
        new Promise((_, reject) => setTimeout(() => reject(new Error('Query execution timed out after 30 seconds')), 100))
      );
      mockPool.end.mockResolvedValue(undefined);

      await expect(executePostgresQuery(config, 'SELECT pg_sleep(35)'))
        .rejects.toThrow('Query execution timed out after 30 seconds');

      expect(mockPool.end).toHaveBeenCalled();
    });

    // Test connection errors
    it('should handle ECONNREFUSED error', async () => {
      const error = new Error('Connection refused') as any;
      error.code = 'ECONNREFUSED';
      mockPool.query.mockRejectedValue(error);
      mockPool.end.mockResolvedValue(undefined);

      await expect(executePostgresQuery(config, 'SELECT 1'))
        .rejects.toThrow(InternalError);

      expect(mockPool.end).toHaveBeenCalled();
    });

    it('should handle ENOTFOUND error', async () => {
      const error = new Error('Host not found') as any;
      error.code = 'ENOTFOUND';
      mockPool.query.mockRejectedValue(error);
      mockPool.end.mockResolvedValue(undefined);

      await expect(executePostgresQuery(config, 'SELECT 1'))
        .rejects.toThrow(InternalError);

      expect(mockPool.end).toHaveBeenCalled();
    });

    it('should handle ETIMEDOUT error', async () => {
      const error = new Error('Connection timed out') as any;
      error.code = 'ETIMEDOUT';
      mockPool.query.mockRejectedValue(error);
      mockPool.end.mockResolvedValue(undefined);

      await expect(executePostgresQuery(config, 'SELECT 1'))
        .rejects.toThrow(InternalError);

      expect(mockPool.end).toHaveBeenCalled();
    });

    it('should handle ENOTFOUND in message', async () => {
      const error = new Error('getaddrinfo ENOTFOUND localhost');
      mockPool.query.mockRejectedValue(error);
      mockPool.end.mockResolvedValue(undefined);

      await expect(executePostgresQuery(config, 'SELECT 1'))
        .rejects.toThrow(InternalError);

      expect(mockPool.end).toHaveBeenCalled();
    });

    it('should handle ECONNREFUSED in message', async () => {
      const error = new Error('connect ECONNREFUSED 127.0.0.1:5432');
      mockPool.query.mockRejectedValue(error);
      mockPool.end.mockResolvedValue(undefined);

      await expect(executePostgresQuery(config, 'SELECT 1'))
        .rejects.toThrow(InternalError);

      expect(mockPool.end).toHaveBeenCalled();
    });

    it('should handle SSL not supported error', async () => {
      const error = new Error('server does not support SSL');
      mockPool.query.mockRejectedValue(error);
      mockPool.end.mockResolvedValue(undefined);

      await expect(executePostgresQuery(config, 'SELECT 1'))
        .rejects.toThrow(InternalError);

      expect(mockPool.end).toHaveBeenCalled();
    });

    // Test PostgreSQL syntax errors
    it('should handle syntax error (42601)', async () => {
      const error = new Error('syntax error at or near "SELEC"') as any;
      error.code = '42601';
      mockPool.query.mockRejectedValue(error);
      mockPool.end.mockResolvedValue(undefined);

      await expect(executePostgresQuery(config, 'SELEC * FROM users'))
        .rejects.toThrow(QueryExecutionError);

      expect(mockPool.end).toHaveBeenCalled();
    });

    it('should handle undefined column error (42703)', async () => {
      const error = new Error('column "nonexistent" does not exist') as any;
      error.code = '42703';
      mockPool.query.mockRejectedValue(error);
      mockPool.end.mockResolvedValue(undefined);

      await expect(executePostgresQuery(config, 'SELECT nonexistent FROM users'))
        .rejects.toThrow(QueryExecutionError);

      expect(mockPool.end).toHaveBeenCalled();
    });

    it('should handle undefined table error (42P01)', async () => {
      const error = new Error('relation "nonexistent_table" does not exist') as any;
      error.code = '42P01';
      mockPool.query.mockRejectedValue(error);
      mockPool.end.mockResolvedValue(undefined);

      await expect(executePostgresQuery(config, 'SELECT * FROM nonexistent_table'))
        .rejects.toThrow(QueryExecutionError);

      expect(mockPool.end).toHaveBeenCalled();
    });

    it('should handle undefined function error (42883)', async () => {
      const error = new Error('function nonexistent_func() does not exist') as any;
      error.code = '42883';
      mockPool.query.mockRejectedValue(error);
      mockPool.end.mockResolvedValue(undefined);

      await expect(executePostgresQuery(config, 'SELECT nonexistent_func()'))
        .rejects.toThrow(QueryExecutionError);

      expect(mockPool.end).toHaveBeenCalled();
    });

    it('should handle undefined parameter error (42P02)', async () => {
      const error = new Error('parameter $1 does not exist') as any;
      error.code = '42P02';
      mockPool.query.mockRejectedValue(error);
      mockPool.end.mockResolvedValue(undefined);

      await expect(executePostgresQuery(config, 'SELECT $1'))
        .rejects.toThrow(QueryExecutionError);

      expect(mockPool.end).toHaveBeenCalled();
    });

    it('should handle datatype mismatch error (42804)', async () => {
      const error = new Error('column "id" is of type integer but expression is of type text') as any;
      error.code = '42804';
      mockPool.query.mockRejectedValue(error);
      mockPool.end.mockResolvedValue(undefined);

      await expect(executePostgresQuery(config, 'UPDATE users SET id = \'text\''))
        .rejects.toThrow(QueryExecutionError);

      expect(mockPool.end).toHaveBeenCalled();
    });

    // Test constraint violations
    it('should handle unique violation (23505)', async () => {
      const error = new Error('duplicate key value violates unique constraint') as any;
      error.code = '23505';
      mockPool.query.mockRejectedValue(error);
      mockPool.end.mockResolvedValue(undefined);

      await expect(executePostgresQuery(config, 'INSERT INTO users (email) VALUES (\'existing@test.com\')'))
        .rejects.toThrow(QueryExecutionError);

      expect(mockPool.end).toHaveBeenCalled();
    });

    it('should handle foreign key violation (23503)', async () => {
      const error = new Error('insert or update on table violates foreign key constraint') as any;
      error.code = '23503';
      mockPool.query.mockRejectedValue(error);
      mockPool.end.mockResolvedValue(undefined);

      await expect(executePostgresQuery(config, 'INSERT INTO orders (user_id) VALUES (999)'))
        .rejects.toThrow(QueryExecutionError);

      expect(mockPool.end).toHaveBeenCalled();
    });

    it('should handle not null violation (23502)', async () => {
      const error = new Error('null value in column "name" violates not-null constraint') as any;
      error.code = '23502';
      mockPool.query.mockRejectedValue(error);
      mockPool.end.mockResolvedValue(undefined);

      await expect(executePostgresQuery(config, 'INSERT INTO users (name) VALUES (NULL)'))
        .rejects.toThrow(QueryExecutionError);

      expect(mockPool.end).toHaveBeenCalled();
    });

    it('should handle check violation (23514)', async () => {
      const error = new Error('new row for relation "users" violates check constraint') as any;
      error.code = '23514';
      mockPool.query.mockRejectedValue(error);
      mockPool.end.mockResolvedValue(undefined);

      await expect(executePostgresQuery(config, 'INSERT INTO users (age) VALUES (-1)'))
        .rejects.toThrow(QueryExecutionError);

      expect(mockPool.end).toHaveBeenCalled();
    });

    // Test authentication errors
    it('should handle invalid authorization (28000)', async () => {
      const error = new Error('invalid authorization specification') as any;
      error.code = '28000';
      mockPool.query.mockRejectedValue(error);
      mockPool.end.mockResolvedValue(undefined);

      await expect(executePostgresQuery(config, 'SELECT 1'))
        .rejects.toThrow(QueryExecutionError);

      expect(mockPool.end).toHaveBeenCalled();
    });

    it('should handle invalid password (28P01)', async () => {
      const error = new Error('password authentication failed for user "testuser"') as any;
      error.code = '28P01';
      mockPool.query.mockRejectedValue(error);
      mockPool.end.mockResolvedValue(undefined);

      await expect(executePostgresQuery(config, 'SELECT 1'))
        .rejects.toThrow(QueryExecutionError);

      expect(mockPool.end).toHaveBeenCalled();
    });

    // Test database errors
    it('should handle invalid database name (3D000)', async () => {
      const error = new Error('database "nonexistent_db" does not exist') as any;
      error.code = '3D000';
      mockPool.query.mockRejectedValue(error);
      mockPool.end.mockResolvedValue(undefined);

      await expect(executePostgresQuery(config, 'SELECT 1'))
        .rejects.toThrow(QueryExecutionError);

      expect(mockPool.end).toHaveBeenCalled();
    });

    // Test connection failure errors
    it('should handle unable to establish connection (08001)', async () => {
      const error = new Error('could not establish connection') as any;
      error.code = '08001';
      mockPool.query.mockRejectedValue(error);
      mockPool.end.mockResolvedValue(undefined);

      await expect(executePostgresQuery(config, 'SELECT 1'))
        .rejects.toThrow(InternalError);

      expect(mockPool.end).toHaveBeenCalled();
    });

    it('should handle connection failure (08006)', async () => {
      const error = new Error('connection failure') as any;
      error.code = '08006';
      mockPool.query.mockRejectedValue(error);
      mockPool.end.mockResolvedValue(undefined);

      await expect(executePostgresQuery(config, 'SELECT 1'))
        .rejects.toThrow(InternalError);

      expect(mockPool.end).toHaveBeenCalled();
    });

    // Test unknown PostgreSQL error codes
    it('should handle unknown PostgreSQL error code', async () => {
      const error = new Error('some unknown postgres error') as any;
      error.code = 'XX999';
      mockPool.query.mockRejectedValue(error);
      mockPool.end.mockResolvedValue(undefined);

      await expect(executePostgresQuery(config, 'SELECT 1'))
        .rejects.toThrow(QueryExecutionError);

      expect(mockPool.end).toHaveBeenCalled();
    });

    // Test generic error without code
    it('should handle generic error without code', async () => {
      const error = new Error('some generic error');
      mockPool.query.mockRejectedValue(error);
      mockPool.end.mockResolvedValue(undefined);

      await expect(executePostgresQuery(config, 'SELECT 1'))
        .rejects.toThrow(QueryExecutionError);

      expect(mockPool.end).toHaveBeenCalled();
    });

    // Test timeout with specific message
    it('should handle timeout error with timed out message', async () => {
      const error = new Error('Query timed out after 30 seconds');
      mockPool.query.mockRejectedValue(error);
      mockPool.end.mockResolvedValue(undefined);

      await expect(executePostgresQuery(config, 'SELECT pg_sleep(35)'))
        .rejects.toThrow(QueryExecutionError);

      expect(mockPool.end).toHaveBeenCalled();
    });
  });
});
