import { DatabaseRepository } from '../../../src/modules/databases/database.repository';
import { pool } from '../../../src/config/db';

jest.mock('../../../src/config/db', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('DatabaseRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findByInstanceId', () => {
    it('should return databases for an instance', async () => {
      const mockDatabases = [
        { id: 'db-1', database_name: 'pg1', instance_id: 'inst-1' },
        { id: 'db-2', database_name: 'pg2', instance_id: 'inst-1' }
      ];
      (pool.query as jest.Mock).mockResolvedValue({ rows: mockDatabases });

      const result = await DatabaseRepository.findByInstanceId('inst-1');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE instance_id = $1'),
        ['inst-1']
      );
      expect(result).toEqual(mockDatabases);
    });

    it('should return empty array when no databases found', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await DatabaseRepository.findByInstanceId('unknown-inst');

      expect(result).toEqual([]);
    });
  });

  describe('exists', () => {
    it('should return true when database exists', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      const result = await DatabaseRepository.exists('inst-1', 'mydb');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE instance_id = $1 AND database_name = $2'),
        ['inst-1', 'mydb']
      );
      expect(result).toBe(true);
    });

    it('should return false when database does not exist', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rowCount: 0 });

      const result = await DatabaseRepository.exists('inst-1', 'nonexistent');

      expect(result).toBe(false);
    });

    it('should return false when rowCount is null', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rowCount: null });

      const result = await DatabaseRepository.exists('inst-1', 'mydb');

      expect(result).toBe(false);
    });
  });
});
