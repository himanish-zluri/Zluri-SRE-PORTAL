import { Pool } from 'pg';

jest.mock('pg', () => {
  const mockPool = {
    query: jest.fn(),
    end: jest.fn()
  };
  return { Pool: jest.fn(() => mockPool) };
});

import { executePostgresQuery } from '../../../src/execution/postgres-query.executor';

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
        ssl: { rejectUnauthorized: false }
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
  });
});
