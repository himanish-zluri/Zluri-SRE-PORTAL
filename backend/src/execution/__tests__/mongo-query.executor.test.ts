import { MongoClient } from 'mongodb';

// Mock mongodb before importing the executor
jest.mock('mongodb');

// Import after mocking
import { executeMongoQuery } from '../../execution/mongo-query.executor';

describe('MongoQueryExecutor', () => {
  let mockDb: any;
  let mockClient: any;
  let mockCollection: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockCollection = {
      find: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([{ id: 1, name: 'test' }])
      }),
      findOne: jest.fn().mockResolvedValue({ id: 1, name: 'test' }),
      insertOne: jest.fn().mockResolvedValue({ insertedId: 'test-id' }),
      insertMany: jest.fn().mockResolvedValue({ insertedIds: ['id1', 'id2'] }),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 2 }),
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 2 }),
      countDocuments: jest.fn().mockResolvedValue(5),
      aggregate: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([{ result: 'aggregated' }])
      })
    };
    
    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection)
    };
    
    mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      db: jest.fn().mockReturnValue(mockDb),
      close: jest.fn().mockResolvedValue(undefined)
    };
    
    (MongoClient as unknown as jest.Mock).mockImplementation(() => mockClient);
  });

  describe('executeMongoQuery', () => {
    it('should connect to mongodb and execute query', async () => {
      const result = await executeMongoQuery(
        'mongodb://localhost:27017',
        'test_db',
        'db.users.find({})'
      );

      expect(MongoClient).toHaveBeenCalledWith('mongodb://localhost:27017', {
        connectTimeoutMS: 10000,
        serverSelectionTimeoutMS: 10000
      });
      expect(mockClient.connect).toHaveBeenCalled();
      expect(mockClient.db).toHaveBeenCalledWith('test_db');
      expect(mockClient.close).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: 'test' }]);
    });

    it('should execute query using collection helper', async () => {
      const result = await executeMongoQuery(
        'mongodb://localhost:27017',
        'test_db',
        'collection("users").find({})'
      );

      expect(mockDb.collection).toHaveBeenCalledWith('users');
      expect(mockClient.close).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: 'test' }]);
    });

    it('should handle proxy collection access with findOne', async () => {
      const result = await executeMongoQuery(
        'mongodb://localhost:27017',
        'test_db',
        'db.products.findOne({ id: 1 })'
      );

      expect(mockDb.collection).toHaveBeenCalledWith('products');
      expect(mockCollection.findOne).toHaveBeenCalledWith({ id: 1 }, undefined);
      expect(result).toEqual({ id: 1, name: 'test' });
    });

    it('should handle all collection methods through proxy', async () => {
      const methods = [
        { query: 'db.test.find({})', method: 'find', args: [{}] },
        { query: 'db.test.findOne({})', method: 'findOne', args: [{}] },
        { query: 'db.test.insertOne({})', method: 'insertOne', args: [{}] },
        { query: 'db.test.insertMany([{}])', method: 'insertMany', args: [[{}]] },
        { query: 'db.test.updateOne({}, {})', method: 'updateOne', args: [{}, {}] },
        { query: 'db.test.updateMany({}, {})', method: 'updateMany', args: [{}, {}] },
        { query: 'db.test.deleteOne({})', method: 'deleteOne', args: [{}] },
        { query: 'db.test.deleteMany({})', method: 'deleteMany', args: [{}] },
        { query: 'db.test.countDocuments({})', method: 'countDocuments', args: [{}] },
        { query: 'db.test.aggregate([])', method: 'aggregate', args: [[]] }
      ];

      for (const { query, method, args } of methods) {
        jest.clearAllMocks();
        mockDb.collection.mockReturnValue(mockCollection);
        
        await executeMongoQuery('mongodb://localhost:27017', 'test_db', query);
        
        expect(mockDb.collection).toHaveBeenCalledWith('test');
        expect(mockCollection[method]).toHaveBeenCalledWith(...args, undefined);
      }
    });

    it('should handle collection helper methods', async () => {
      const methods = [
        { query: 'collection("users").find({})', method: 'find' },
        { query: 'collection("users").findOne({})', method: 'findOne' },
        { query: 'collection("users").insertOne({})', method: 'insertOne' },
        { query: 'collection("users").insertMany([{}])', method: 'insertMany' },
        { query: 'collection("users").updateOne({}, {})', method: 'updateOne' },
        { query: 'collection("users").updateMany({}, {})', method: 'updateMany' },
        { query: 'collection("users").deleteOne({})', method: 'deleteOne' },
        { query: 'collection("users").deleteMany({})', method: 'deleteMany' },
        { query: 'collection("users").countDocuments({})', method: 'countDocuments' },
        { query: 'collection("users").aggregate([])', method: 'aggregate' }
      ];

      for (const { query, method } of methods) {
        jest.clearAllMocks();
        mockDb.collection.mockReturnValue(mockCollection);
        
        await executeMongoQuery('mongodb://localhost:27017', 'test_db', query);
        
        expect(mockDb.collection).toHaveBeenCalledWith('users');
        expect(mockCollection[method]).toHaveBeenCalled();
      }
    });

    it('should handle proxy non-string property access', async () => {
      const result = await executeMongoQuery(
        'mongodb://localhost:27017',
        'test_db',
        'db[Symbol.iterator] || "no symbol"'
      );

      expect(result).toBe('no symbol');
    });

    it('should handle query execution error', async () => {
      // Mock the AsyncFunction to throw an error
      const originalAsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      const mockAsyncFunction = jest.fn().mockImplementation(() => {
        throw new Error('MongoDB query failed: Query error');
      });
      
      Object.defineProperty(Object.getPrototypeOf(async function(){}), 'constructor', {
        value: mockAsyncFunction,
        writable: true
      });

      await expect(executeMongoQuery(
        'mongodb://localhost:27017',
        'test_db',
        'db.users.find({})'
      )).rejects.toThrow('MongoDB query failed: Query error');

      expect(mockClient.close).toHaveBeenCalled();
      
      // Restore original
      Object.defineProperty(Object.getPrototypeOf(async function(){}), 'constructor', {
        value: originalAsyncFunction,
        writable: true
      });
    });

    it('should close connection on connection error', async () => {
      mockClient.connect.mockRejectedValue(new Error('Connection failed'));

      await expect(executeMongoQuery(
        'mongodb://localhost:27017',
        'test_db',
        'db.users.find({})'
      )).rejects.toThrow('Connection failed');

      expect(mockClient.close).toHaveBeenCalled();
    });

    it('should handle complex query with options', async () => {
      const result = await executeMongoQuery(
        'mongodb://localhost:27017',
        'test_db',
        'db.users.find({ status: "active" }, { limit: 10 })'
      );

      expect(mockCollection.find).toHaveBeenCalledWith({ status: "active" }, { limit: 10 });
      expect(result).toEqual([{ id: 1, name: 'test' }]);
    });

    it('should handle aggregate with pipeline', async () => {
      const result = await executeMongoQuery(
        'mongodb://localhost:27017',
        'test_db',
        'db.users.aggregate([{ $match: { status: "active" } }])'
      );

      expect(mockCollection.aggregate).toHaveBeenCalledWith([{ $match: { status: "active" } }], undefined);
      expect(result).toEqual([{ result: 'aggregated' }]);
    });

    // Test cases to cover default parameter branches
    it('should handle proxy methods with default parameters', async () => {
      // Test find without parameters (default empty object)
      await executeMongoQuery(
        'mongodb://localhost:27017',
        'test_db',
        'db.users.find()'
      );
      expect(mockCollection.find).toHaveBeenCalledWith({}, undefined);

      // Test findOne without parameters (default empty object)
      await executeMongoQuery(
        'mongodb://localhost:27017',
        'test_db',
        'db.users.findOne()'
      );
      expect(mockCollection.findOne).toHaveBeenCalledWith({}, undefined);

      // Test countDocuments without parameters (default empty object)
      await executeMongoQuery(
        'mongodb://localhost:27017',
        'test_db',
        'db.users.countDocuments()'
      );
      expect(mockCollection.countDocuments).toHaveBeenCalledWith({}, undefined);
    });

    it('should handle collection helper methods with default parameters', async () => {
      // Test find without parameters (default empty object)
      await executeMongoQuery(
        'mongodb://localhost:27017',
        'test_db',
        'collection("users").find()'
      );
      expect(mockCollection.find).toHaveBeenCalled();

      // Test findOne without parameters (default empty object)
      await executeMongoQuery(
        'mongodb://localhost:27017',
        'test_db',
        'collection("users").findOne()'
      );
      expect(mockCollection.findOne).toHaveBeenCalled();

      // Test countDocuments without parameters (default empty object)
      await executeMongoQuery(
        'mongodb://localhost:27017',
        'test_db',
        'collection("users").countDocuments()'
      );
      expect(mockCollection.countDocuments).toHaveBeenCalled();
    });

    it('should handle async function creation and execution', async () => {
      // This test ensures the AsyncFunction constructor is covered
      const result = await executeMongoQuery(
        'mongodb://localhost:27017',
        'test_db',
        'Promise.resolve("async test")'
      );

      expect(result).toBe('async test');
    });

    it('should cover AsyncFunction prototype access', async () => {
      // This test specifically covers the async function prototype access
      // that was showing as uncovered in the coverage report
      const result = await executeMongoQuery(
        'mongodb://localhost:27017',
        'test_db',
        '(async () => { return "prototype test"; })()'
      );

      expect(result).toBe('prototype test');
    });
  });
});
