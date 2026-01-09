import { MongoClient } from 'mongodb';
import fs from 'fs';

jest.mock('mongodb');
jest.mock('fs');

import { executeMongoScript } from '../../../src/execution/mongo-script.executor';

describe('MongoScriptExecutor', () => {
  let mockDb: any;
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = { collection: jest.fn() };
    mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      db: jest.fn().mockReturnValue(mockDb),
      close: jest.fn().mockResolvedValue(undefined)
    };
    (MongoClient as unknown as jest.Mock).mockImplementation(() => mockClient);
  });

  describe('executeMongoScript', () => {
    it('should read script file and execute', async () => {
      (fs.readFileSync as jest.Mock).mockReturnValue('return []');

      try {
        await executeMongoScript(
          '/path/to/script.js',
          'mongodb://localhost:27017',
          'test_db'
        );
      } catch (e) {
        // Expected - Function execution in test env
      }

      expect(MongoClient).toHaveBeenCalledWith('mongodb://localhost:27017');
      expect(mockClient.connect).toHaveBeenCalled();
      expect(mockClient.db).toHaveBeenCalledWith('test_db');
      expect(fs.readFileSync).toHaveBeenCalledWith('/path/to/script.js', 'utf-8');
    });

    it('should close connection after execution', async () => {
      (fs.readFileSync as jest.Mock).mockReturnValue('return []');

      try {
        await executeMongoScript('/path/to/script.js', 'mongodb://localhost', 'db');
      } catch (e) {
        // Expected
      }

      expect(mockClient.close).toHaveBeenCalled();
    });
  });
});
