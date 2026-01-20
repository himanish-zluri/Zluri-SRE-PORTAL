import { Pool } from 'pg';

jest.mock('pg', () => {
  const mockPool = {
    query: jest.fn(),
    end: jest.fn()
  };
  return { Pool: jest.fn(() => mockPool) };
});

import { executePostgresQuery } from '../../execution/postgres-query.executor';

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
  });
});
