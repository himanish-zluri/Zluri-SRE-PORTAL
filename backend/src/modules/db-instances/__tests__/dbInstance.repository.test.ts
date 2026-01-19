import { DbInstanceRepository } from '../../../modules/db-instances/dbInstance.repository';
import { getEntityManager } from '../../../config/database';

jest.mock('../../../utils/crypto', () => ({
  decrypt: jest.fn((val) => `decrypted_${val}`)
}));

// Mock the getEntityManager function
jest.mock('../../../config/database', () => ({
  getEntityManager: jest.fn()
}));

const mockGetEntityManager = getEntityManager as jest.MockedFunction<typeof getEntityManager>;

// Create a mock entity manager
const mockEntityManager = {
  find: jest.fn(),
  findOne: jest.fn(),
  findOneOrFail: jest.fn(),
  count: jest.fn(),
  persistAndFlush: jest.fn(),
  flush: jest.fn(),
  nativeDelete: jest.fn(),
  fork: jest.fn(),
  createQueryBuilder: jest.fn(),
};

describe('DbInstanceRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure getEntityManager returns our mock
    mockGetEntityManager.mockReturnValue(mockEntityManager as any);
  });

  describe('findById', () => {
    it('should return instance with decrypted credentials (except username)', async () => {
      const mockInstance = {
        id: 'inst-1',
        name: 'pg-instance',
        type: 'POSTGRES',
        host: 'localhost',
        port: 5432,
        username: 'plain_user',
        password: 'encrypted_pass',
        createdAt: new Date()
      };
      mockEntityManager.findOne.mockResolvedValue(mockInstance);

      const result = await DbInstanceRepository.findById('inst-1');

      expect(mockEntityManager.findOne).toHaveBeenCalledWith(
        expect.any(Function),
        { id: 'inst-1' }
      );
      expect(result).toEqual(expect.objectContaining({
        id: 'inst-1',
        username: 'plain_user', // Username is not decrypted
        password: 'decrypted_encrypted_pass'
      }));
    });

    it('should return null when instance not found', async () => {
      mockEntityManager.findOne.mockResolvedValue(null);

      const result = await DbInstanceRepository.findById('invalid-id');

      expect(result).toBeNull();
    });

    it('should decrypt mongo_uri for MongoDB instances', async () => {
      const mockInstance = {
        id: 'inst-2',
        name: 'mongo-instance',
        type: 'MONGODB',
        mongoUri: 'encrypted_uri',
        createdAt: new Date()
      };
      mockEntityManager.findOne.mockResolvedValue(mockInstance);

      const result = await DbInstanceRepository.findById('inst-2');

      expect(result?.mongo_uri).toBe('decrypted_encrypted_uri');
    });

    it('should handle null credentials', async () => {
      const mockInstance = {
        id: 'inst-1',
        name: 'instance',
        type: 'POSTGRES',
        username: null,
        password: null,
        createdAt: new Date()
      };
      mockEntityManager.findOne.mockResolvedValue(mockInstance);

      const result = await DbInstanceRepository.findById('inst-1');

      expect(result?.username).toBeNull();
      expect(result?.password).toBeUndefined();
    });
  });

  describe('findByType', () => {
    it('should return instances filtered by type', async () => {
      const mockInstances = [
        { id: 'inst-1', name: 'pg-1', type: 'POSTGRES' },
        { id: 'inst-2', name: 'pg-2', type: 'POSTGRES' }
      ];
      mockEntityManager.find.mockResolvedValue(mockInstances);

      const result = await DbInstanceRepository.findByType('POSTGRES');

      expect(mockEntityManager.find).toHaveBeenCalledWith(
        expect.any(Function),
        { type: 'POSTGRES' },
        expect.objectContaining({
          fields: ['id', 'name', 'type'],
          orderBy: { name: 'ASC' }
        })
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
      mockEntityManager.find.mockResolvedValue(mockInstances);

      const result = await DbInstanceRepository.findAll();

      expect(mockEntityManager.find).toHaveBeenCalledWith(
        expect.any(Function),
        {},
        expect.objectContaining({
          fields: ['id', 'name', 'type'],
          orderBy: { name: 'ASC' }
        })
      );
      expect(result).toEqual(mockInstances);
    });
  });
});
