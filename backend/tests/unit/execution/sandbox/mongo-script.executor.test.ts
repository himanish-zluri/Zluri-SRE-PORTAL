import { run, handleStartupError, main } from '../../../../src/execution/sandbox/mongo-script.executor';
import { MongoClient } from 'mongodb';
import fs from 'fs';

jest.mock('mongodb');
jest.mock('fs');

describe('MongoScriptExecutor', () => {
  let mockClient: any;
  let mockDb: any;
  let mockCollection: any;
  let originalArgv: string[];
  let originalExit: typeof process.exit;
  let originalStdout: typeof process.stdout.write;
  let originalStderr: typeof process.stderr.write;
  let exitCode: number | undefined;
  let stdoutOutput: string;
  let stderrOutput: string;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock process methods
    originalArgv = process.argv;
    originalExit = process.exit;
    originalStdout = process.stdout.write;
    originalStderr = process.stderr.write;
    
    exitCode = undefined;
    stdoutOutput = '';
    stderrOutput = '';
    
    process.exit = jest.fn((code?: number) => {
      exitCode = code;
      throw new Error(`Process exit: ${code}`);
    }) as any;
    
    process.stdout.write = jest.fn((data: string) => {
      stdoutOutput += data;
      return true;
    }) as any;
    
    process.stderr.write = jest.fn((data: string) => {
      stderrOutput += data;
      return true;
    }) as any;

    // Mock MongoDB
    mockCollection = {
      find: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([{ id: 1 }])
      }),
      findOne: jest.fn().mockResolvedValue({ id: 1 }),
      insertOne: jest.fn().mockResolvedValue({ insertedId: 'test' }),
      insertMany: jest.fn().mockResolvedValue({ insertedIds: ['1', '2'] }),
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
      collection: jest.fn().mockReturnValue(mockCollection),
      admin: jest.fn().mockReturnValue({
        listDatabases: jest.fn().mockResolvedValue({
          databases: [{ name: 'test' }]
        })
      })
    };

    mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      db: jest.fn().mockReturnValue(mockDb),
      close: jest.fn().mockResolvedValue(undefined)
    };

    (MongoClient as unknown as jest.Mock).mockImplementation(() => mockClient);
    (fs.readFileSync as jest.Mock).mockReturnValue('db.users.find({})');
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.exit = originalExit;
    process.stdout.write = originalStdout;
    process.stderr.write = originalStderr;
  });

  describe('run', () => {
    it('should execute script successfully', async () => {
      process.argv = ['node', 'script.js', JSON.stringify({
        scriptPath: '/test.js',
        mongoUri: 'mongodb://localhost:27017',
        databaseName: 'testdb'
      })];

      await run();

      expect(mockClient.connect).toHaveBeenCalled();
      expect(mockClient.db).toHaveBeenCalledWith('testdb');
      expect(mockClient.close).toHaveBeenCalled();
      
      const output = JSON.parse(stdoutOutput);
      expect(output.success).toBe(true);
    });

    it('should exit with error when no config provided', async () => {
      process.argv = ['node', 'script.js'];

      try {
        await run();
      } catch (e) {
        // Expected to throw due to process.exit
      }

      expect(exitCode).toBe(1);
      // The actual implementation uses console.error, not process.stderr.write
      expect(process.stderr.write).not.toHaveBeenCalled();
    });

    it('should exit with error when config is invalid JSON', async () => {
      process.argv = ['node', 'script.js', 'invalid-json'];

      try {
        await run();
      } catch (e) {
        // Expected to throw due to process.exit
      }

      expect(exitCode).toBe(1);
      // The actual implementation uses console.error, not process.stderr.write
      expect(process.stderr.write).not.toHaveBeenCalled();
    });

    it('should handle script execution error', async () => {
      process.argv = ['node', 'script.js', JSON.stringify({
        scriptPath: '/test.js',
        mongoUri: 'mongodb://localhost:27017',
        databaseName: 'testdb'
      })];

      mockClient.connect.mockRejectedValue(new Error('Connection failed'));

      try {
        await run();
      } catch (e) {
        // Expected to throw due to process.exit
      }

      expect(exitCode).toBe(1);
      const output = JSON.parse(stdoutOutput);
      expect(output.success).toBe(false);
      expect(output.error).toBe('Connection failed');
    });

    it('should capture console logs', async () => {
      process.argv = ['node', 'script.js', JSON.stringify({
        scriptPath: '/test.js',
        mongoUri: 'mongodb://localhost:27017',
        databaseName: 'testdb'
      })];

      (fs.readFileSync as jest.Mock).mockReturnValue(`
        console.log('test log');
        console.error('test error');
        return { result: 'success' };
      `);

      await run();

      const output = JSON.parse(stdoutOutput);
      expect(output.logs).toContain('test log');
      expect(output.logs).toContainEqual({ error: 'test error' });
    });

    it('should use collection helper function', async () => {
      process.argv = ['node', 'script.js', JSON.stringify({
        scriptPath: '/test.js',
        mongoUri: 'mongodb://localhost:27017',
        databaseName: 'testdb'
      })];

      (fs.readFileSync as jest.Mock).mockReturnValue('collection("users").find({})');

      await run();

      expect(mockDb.collection).toHaveBeenCalledWith('users');
      const output = JSON.parse(stdoutOutput);
      expect(output.success).toBe(true);
    });

    it('should handle proxy collection access', async () => {
      process.argv = ['node', 'script.js', JSON.stringify({
        scriptPath: '/test.js',
        mongoUri: 'mongodb://localhost:27017',
        databaseName: 'testdb'
      })];

      (fs.readFileSync as jest.Mock).mockReturnValue('db.products.findOne({ id: 1 })');

      await run();

      expect(mockDb.collection).toHaveBeenCalledWith('products');
      expect(mockCollection.findOne).toHaveBeenCalledWith({ id: 1 }, undefined);
    });

    it('should handle all collection methods through proxy', async () => {
      process.argv = ['node', 'script.js', JSON.stringify({
        scriptPath: '/test.js',
        mongoUri: 'mongodb://localhost:27017',
        databaseName: 'testdb'
      })];

      const methods = [
        'db.test.find({})',
        'db.test.findOne({})',
        'db.test.insertOne({})',
        'db.test.insertMany([{}])',
        'db.test.updateOne({}, {})',
        'db.test.updateMany({}, {})',
        'db.test.deleteOne({})',
        'db.test.deleteMany({})',
        'db.test.countDocuments({})',
        'db.test.aggregate([])'
      ];

      for (const method of methods) {
        (fs.readFileSync as jest.Mock).mockReturnValue(method);
        stdoutOutput = ''; // Reset output
        
        await run();
        
        const output = JSON.parse(stdoutOutput);
        expect(output.success).toBe(true);
      }
    });

    it('should handle collection methods with options', async () => {
      process.argv = ['node', 'script.js', JSON.stringify({
        scriptPath: '/test.js',
        mongoUri: 'mongodb://localhost:27017',
        databaseName: 'testdb'
      })];

      const methodsWithOptions = [
        'db.test.find({}, { limit: 10 })',
        'db.test.findOne({}, { projection: { name: 1 } })',
        'db.test.insertOne({}, { ordered: true })',
        'db.test.insertMany([{}], { ordered: false })',
        'db.test.updateOne({}, {}, { upsert: true })',
        'db.test.updateMany({}, {}, { upsert: false })',
        'db.test.deleteOne({}, { hint: "index" })',
        'db.test.deleteMany({}, { hint: "index" })',
        'db.test.countDocuments({}, { limit: 100 })',
        'db.test.aggregate([], { allowDiskUse: true })'
      ];

      for (const method of methodsWithOptions) {
        (fs.readFileSync as jest.Mock).mockReturnValue(method);
        stdoutOutput = ''; // Reset output
        
        await run();
        
        const output = JSON.parse(stdoutOutput);
        expect(output.success).toBe(true);
      }
    });

    it('should handle collection helper methods with options', async () => {
      process.argv = ['node', 'script.js', JSON.stringify({
        scriptPath: '/test.js',
        mongoUri: 'mongodb://localhost:27017',
        databaseName: 'testdb'
      })];

      const helperMethods = [
        'collection("users").find({}, { limit: 5 })',
        'collection("users").findOne({}, { projection: { _id: 0 } })',
        'collection("users").insertOne({}, { ordered: true })',
        'collection("users").insertMany([{}], { ordered: false })',
        'collection("users").updateOne({}, {}, { upsert: true })',
        'collection("users").updateMany({}, {}, { upsert: false })',
        'collection("users").deleteOne({}, { hint: "index" })',
        'collection("users").deleteMany({}, { hint: "index" })',
        'collection("users").countDocuments({}, { limit: 100 })',
        'collection("users").aggregate([], { allowDiskUse: true })'
      ];

      for (const method of helperMethods) {
        (fs.readFileSync as jest.Mock).mockReturnValue(method);
        stdoutOutput = ''; // Reset output
        
        await run();
        
        const output = JSON.parse(stdoutOutput);
        expect(output.success).toBe(true);
      }
    });

    it('should handle proxy get for non-string properties', async () => {
      process.argv = ['node', 'script.js', JSON.stringify({
        scriptPath: '/test.js',
        mongoUri: 'mongodb://localhost:27017',
        databaseName: 'testdb'
      })];

      // Test accessing non-string property (like Symbol or number)
      (fs.readFileSync as jest.Mock).mockReturnValue(`
        const sym = Symbol('test');
        db[sym] = 'test';
        return db[sym];
      `);

      await run();

      const output = JSON.parse(stdoutOutput);
      expect(output.success).toBe(true);
    });

    it('should handle script with return value from logs', async () => {
      process.argv = ['node', 'script.js', JSON.stringify({
        scriptPath: '/test.js',
        mongoUri: 'mongodb://localhost:27017',
        databaseName: 'testdb'
      })];

      (fs.readFileSync as jest.Mock).mockReturnValue(`
        console.log('first log');
        console.log({ final: 'result' });
        // No explicit return
      `);

      await run();

      const output = JSON.parse(stdoutOutput);
      expect(output.success).toBe(true);
      expect(output.result).toEqual({ final: 'result' });
    });
  });

  describe('handleStartupError', () => {
    it('should write error to stderr and exit', () => {
      const error = new Error('Startup failed');

      try {
        handleStartupError(error);
      } catch (e) {
        // Expected to throw due to process.exit
      }

      expect(exitCode).toBe(1);
      const output = JSON.parse(stderrOutput);
      expect(output.error).toBe('Startup failed');
    });
  });

  describe('main', () => {
    it('should call run and handle errors', async () => {
      // Don't mock run, just test that main calls it
      process.argv = ['node', 'script.js', JSON.stringify({
        scriptPath: '/test.js',
        mongoUri: 'mongodb://localhost:27017',
        databaseName: 'testdb'
      })];

      // This will call the actual run function
      main();
      
      // Wait for async execution
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Verify it executed successfully
      expect(stdoutOutput).toContain('success');
    });
  });
});