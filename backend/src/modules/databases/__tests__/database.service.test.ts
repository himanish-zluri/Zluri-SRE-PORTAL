import { DatabaseService } from '../../../modules/databases/database.service';
import { DbInstanceRepository } from '../../../modules/db-instances/dbInstance.repository';

// Mock dependencies before importing
jest.mock('../../../modules/db-instances/dbInstance.repository');

// Create mock objects
const mockPgPool = {
  query: jest.fn(),
  end: jest.fn()
};

const mockMongoClient = {
  connect: jest.fn(),
  db: jest.fn(),
  close: jest.fn()
};

const mockAdminDb = {
  listDatabases: jest.fn()
};

// Mock pg module
jest.mock('pg', () => {
  return {
    Pool: jest.fn().mockImplementation(() => ({
      query: jest.fn(),
      end: jest.fn()
    }))
  };
});

// Mock mongodb module
jest.mock('mongodb', () => {
  return {
    MongoClient: jest.fn().mockImplementation(() => ({
      connect: jest.fn(),
      db: jest.fn(),
      close: jest.fn()
    }))
  };
});

describe('DatabaseService', () => {
  let Pool: jest.Mock;
  let MongoClient: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get fresh references to mocked constructors
    Pool = require('pg').Pool;
    MongoClient = require('mongodb').MongoClient;
  });

  describe('listDatabasesFromInstance', () => {
    it('should throw error when instance not found', async () => {
      (DbInstanceRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(DatabaseService.listDatabasesFromInstance('invalid-id'))
        .rejects.toThrow('Instance not found');
    });

    it('should list PostgreSQL databases', async () => {
      const mockInstance = {
        id: 'inst-1',
        type: 'POSTGRES',
        host: 'localhost',
        port: 5432,
        username: 'user',
        password: 'pass'
      };
      (DbInstanceRepository.findById as jest.Mock).mockResolvedValue(mockInstance);
      
      const mockPoolInstance = {
        query: jest.fn().mockResolvedValue({
          rows: [{ datname: 'db1' }, { datname: 'db2' }]
        }),
        end: jest.fn().mockResolvedValue(undefined)
      };
      Pool.mockImplementation(() => mockPoolInstance);

      const result = await DatabaseService.listDatabasesFromInstance('inst-1');

      expect(result).toEqual(['db1', 'db2']);
      expect(mockPoolInstance.end).toHaveBeenCalled();
    });

    it('should throw error when Postgres instance missing connection details', async () => {
      const mockInstance = {
        id: 'inst-1',
        type: 'POSTGRES',
        host: null,
        port: null
      };
      (DbInstanceRepository.findById as jest.Mock).mockResolvedValue(mockInstance);

      await expect(DatabaseService.listDatabasesFromInstance('inst-1'))
        .rejects.toThrow('Postgres instance missing connection details');
    });

    it('should throw error when Postgres instance missing username', async () => {
      const mockInstance = {
        id: 'inst-1',
        type: 'POSTGRES',
        host: 'localhost',
        port: 5432,
        username: null,
        password: 'pass'
      };
      (DbInstanceRepository.findById as jest.Mock).mockResolvedValue(mockInstance);

      await expect(DatabaseService.listDatabasesFromInstance('inst-1'))
        .rejects.toThrow('Postgres instance missing connection details');
    });

    it('should throw error when Postgres instance missing password', async () => {
      const mockInstance = {
        id: 'inst-1',
        type: 'POSTGRES',
        host: 'localhost',
        port: 5432,
        username: 'user',
        password: null
      };
      (DbInstanceRepository.findById as jest.Mock).mockResolvedValue(mockInstance);

      await expect(DatabaseService.listDatabasesFromInstance('inst-1'))
        .rejects.toThrow('Postgres instance missing connection details');
    });

    it('should list MongoDB databases', async () => {
      const mockInstance = {
        id: 'inst-2',
        type: 'MONGODB',
        mongo_uri: 'mongodb://localhost:27017'
      };
      (DbInstanceRepository.findById as jest.Mock).mockResolvedValue(mockInstance);
      
      const mockMongoInstance = {
        connect: jest.fn().mockResolvedValue(undefined),
        db: jest.fn().mockReturnValue({
          admin: () => ({
            listDatabases: jest.fn().mockResolvedValue({
              databases: [
                { name: 'mydb1' },
                { name: 'mydb2' },
                { name: 'admin' },
                { name: 'local' },
                { name: 'config' }
              ]
            })
          })
        }),
        close: jest.fn().mockResolvedValue(undefined)
      };
      MongoClient.mockImplementation(() => mockMongoInstance);

      const result = await DatabaseService.listDatabasesFromInstance('inst-2');

      expect(result).toEqual(['mydb1', 'mydb2']);
      expect(mockMongoInstance.close).toHaveBeenCalled();
    });

    it('should throw error when MongoDB instance missing URI', async () => {
      const mockInstance = {
        id: 'inst-2',
        type: 'MONGODB',
        mongo_uri: null
      };
      (DbInstanceRepository.findById as jest.Mock).mockResolvedValue(mockInstance);

      await expect(DatabaseService.listDatabasesFromInstance('inst-2'))
        .rejects.toThrow('MongoDB instance missing connection URI');
    });

    it('should throw error for unsupported database type', async () => {
      const mockInstance = {
        id: 'inst-3',
        type: 'MYSQL'
      };
      (DbInstanceRepository.findById as jest.Mock).mockResolvedValue(mockInstance);

      await expect(DatabaseService.listDatabasesFromInstance('inst-3'))
        .rejects.toThrow('Unsupported database type: MYSQL');
    });

    it('should close pool even when query fails for Postgres', async () => {
      const mockInstance = {
        id: 'inst-1',
        type: 'POSTGRES',
        host: 'localhost',
        port: 5432,
        username: 'user',
        password: 'pass'
      };
      (DbInstanceRepository.findById as jest.Mock).mockResolvedValue(mockInstance);
      
      const mockPoolInstance = {
        query: jest.fn().mockRejectedValue(new Error('Query failed')),
        end: jest.fn().mockResolvedValue(undefined)
      };
      Pool.mockImplementation(() => mockPoolInstance);

      await expect(DatabaseService.listDatabasesFromInstance('inst-1'))
        .rejects.toThrow('Could not connect to any database on this instance');
      expect(mockPoolInstance.end).toHaveBeenCalled();
    });

    it('should close client even when MongoDB operation fails', async () => {
      const mockInstance = {
        id: 'inst-2',
        type: 'MONGODB',
        mongo_uri: 'mongodb://localhost:27017'
      };
      (DbInstanceRepository.findById as jest.Mock).mockResolvedValue(mockInstance);
      
      const mockMongoInstance = {
        connect: jest.fn().mockRejectedValue(new Error('Connection failed')),
        close: jest.fn().mockResolvedValue(undefined)
      };
      MongoClient.mockImplementation(() => mockMongoInstance);

      await expect(DatabaseService.listDatabasesFromInstance('inst-2'))
        .rejects.toThrow('Connection failed');
      expect(mockMongoInstance.close).toHaveBeenCalled();
    });

    it('should try multiple databases for Postgres connection and succeed on second try', async () => {
      const mockInstance = {
        id: 'inst-1',
        type: 'POSTGRES',
        host: 'localhost',
        port: 5432,
        username: 'user',
        password: 'pass'
      };
      (DbInstanceRepository.findById as jest.Mock).mockResolvedValue(mockInstance);
      
      let callCount = 0;
      const mockPoolInstance = {
        query: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            throw new Error('Connection failed to postgres db');
          }
          return Promise.resolve({
            rows: [{ datname: 'db1' }, { datname: 'db2' }]
          });
        }),
        end: jest.fn().mockResolvedValue(undefined)
      };
      
      Pool.mockImplementation(() => mockPoolInstance);

      const result = await DatabaseService.listDatabasesFromInstance('inst-1');

      expect(result).toEqual(['db1', 'db2']);
      expect(Pool).toHaveBeenCalledTimes(2); // First call fails, second succeeds
      expect(mockPoolInstance.end).toHaveBeenCalled();
    });

    it('should handle pool.end() failure gracefully during connection retry', async () => {
      const mockInstance = {
        id: 'inst-1',
        type: 'POSTGRES',
        host: 'localhost',
        port: 5432,
        username: 'user',
        password: 'pass'
      };
      (DbInstanceRepository.findById as jest.Mock).mockResolvedValue(mockInstance);
      
      let callCount = 0;
      Pool.mockImplementation(() => ({
        query: jest.fn().mockImplementation(() => {
          callCount++;
          throw new Error('Connection failed');
        }),
        end: jest.fn().mockImplementation(() => {
          if (callCount <= 2) {
            return Promise.reject(new Error('End failed'));
          }
          return Promise.resolve();
        })
      }));

      await expect(DatabaseService.listDatabasesFromInstance('inst-1'))
        .rejects.toThrow('Could not connect to any database on this instance');
    });

    it('should handle pool.end() failure in catch block during retry', async () => {
      const mockInstance = {
        id: 'inst-1',
        type: 'POSTGRES',
        host: 'localhost',
        port: 5432,
        username: 'user',
        password: 'pass'
      };
      (DbInstanceRepository.findById as jest.Mock).mockResolvedValue(mockInstance);
      
      // Create pools that fail connection but also fail to close properly
      const failingPools = Array.from({ length: 4 }, () => ({
        query: jest.fn().mockRejectedValue(new Error('Connection failed')),
        end: jest.fn().mockRejectedValue(new Error('End failed'))
      }));
      
      let poolIndex = 0;
      Pool.mockImplementation(() => {
        return failingPools[poolIndex++] || failingPools[failingPools.length - 1];
      });

      await expect(DatabaseService.listDatabasesFromInstance('inst-1'))
        .rejects.toThrow('Could not connect to any database on this instance');
      
      // Verify that end() was called on each pool despite failures
      failingPools.forEach(pool => {
        expect(pool.end).toHaveBeenCalled();
      });
    });

    it('should handle successful connection but query failure in finally block', async () => {
      const mockInstance = {
        id: 'inst-1',
        type: 'POSTGRES',
        host: 'localhost',
        port: 5432,
        username: 'user',
        password: 'pass'
      };
      (DbInstanceRepository.findById as jest.Mock).mockResolvedValue(mockInstance);
      
      const mockPoolInstance = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // First call for connection test succeeds
          .mockRejectedValueOnce(new Error('Query failed')), // Second call for actual query fails
        end: jest.fn().mockResolvedValue(undefined)
      };
      
      Pool.mockImplementation(() => mockPoolInstance);

      await expect(DatabaseService.listDatabasesFromInstance('inst-1'))
        .rejects.toThrow('Query failed');
      expect(mockPoolInstance.end).toHaveBeenCalled();
    });
  });
});
