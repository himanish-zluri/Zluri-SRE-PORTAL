import { DbInstanceRepository } from '../../../src/modules/db-instances/dbInstance.repository';
import { pool } from '../../../src/config/db';

jest.mock('../../../src/config/db', () => ({
  pool: {
    query: jest.fn()
  }
}));

jest.mock('../../../src/utils/crypto', () => ({
  decrypt: jest.fn((val) => `decrypted_${val}`)
}));

describe('DbInstanceRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return instance with decrypted credentials', async () => {
      const mockInstance = {
        id: 'inst-1',
        name: 'pg-instance',
        type: 'POSTGRES',
        host: 'localhost',
        port: 5432,
        username: 'encrypted_user',
        password: 'encrypted_pass'
      };
      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockInstance] });

      const result = await DbInstanceRepository.findById('inst-1');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        ['inst-1']
      );
      expect(result).toEqual(expect.objectContaining({
        id: 'inst-1',
        username: 'decrypted_encrypted_user',
        password: 'decrypted_encrypted_pass'
      }));
    });

    it('should return null when instance not found', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await DbInstanceRepository.findById('invalid-id');

      expect(result).toBeNull();
    });

    it('should decrypt mongo_uri for MongoDB instances', async () => {
      const mockInstance = {
        id: 'inst-2',
        name: 'mongo-instance',
        type: 'MONGODB',
        mongo_uri: 'encrypted_uri'
      };
      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockInstance] });

      const result = await DbInstanceRepository.findById('inst-2');

      expect(result?.mongo_uri).toBe('decrypted_encrypted_uri');
    });

    it('should handle null credentials', async () => {
      const mockInstance = {
        id: 'inst-1',
        name: 'instance',
        type: 'POSTGRES',
        username: null,
        password: null
      };
      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockInstance] });

      const result = await DbInstanceRepository.findById('inst-1');

      expect(result?.username).toBeUndefined();
      expect(result?.password).toBeUndefined();
    });
  });

  describe('findByType', () => {
    it('should return instances filtered by type', async () => {
      const mockInstances = [
        { id: 'inst-1', name: 'pg-1', type: 'POSTGRES' },
        { id: 'inst-2', name: 'pg-2', type: 'POSTGRES' }
      ];
      (pool.query as jest.Mock).mockResolvedValue({ rows: mockInstances });

      const result = await DbInstanceRepository.findByType('POSTGRES');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE type = $1'),
        ['POSTGRES']
      );
      expect(result).toEqual(mockInstances);
    });
  });

  describe('findAll', () => {
    it('should return all instances', async () => {
      const mockInstances = [
        { id: 'inst-1', name: 'pg-instance', type: 'POSTGRES' },
        { id: 'inst-2', name: 'mongo-instance', type: 'MONGODB' }
      ];
      (pool.query as jest.Mock).mockResolvedValue({ rows: mockInstances });

      const result = await DbInstanceRepository.findAll();

      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'));
      expect(result).toEqual(mockInstances);
    });
  });
});
