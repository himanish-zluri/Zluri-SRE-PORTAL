/**
 * MongoDB Script Runner - Runs in isolated child process
 * 
 * Receives: scriptPath, mongoUri, databaseName via process.argv
 * Outputs: Results via stdout, errors via stderr
 */
import { MongoClient } from 'mongodb';
import fs from 'fs';

interface RunnerConfig {
  scriptPath: string;
  mongoUri: string;
  databaseName: string;
}

export async function run() {
  // Parse config from command line argument
  const configJson = process.argv[2];
  if (!configJson) {
    console.error(JSON.stringify({ error: 'No config provided' }));
    process.exit(1);
  }

  let config: RunnerConfig;
  try {
    config = JSON.parse(configJson);
  } catch {
    console.error(JSON.stringify({ error: 'Invalid config JSON' }));
    process.exit(1);
  }

  const client = new MongoClient(config.mongoUri, {
    connectTimeoutMS: 10000,
    serverSelectionTimeoutMS: 10000,
  });

  try {
    await client.connect();
    const database = client.db(config.databaseName);

    // Create a simple db object that maps collection names to collections
    const db: any = {};
    
    // Pre-populate with common collection names and create a proxy for dynamic access
    const dbProxy = new Proxy(db, {
      get(target, collectionName) {
        if (typeof collectionName === 'string') {
          // Create collection wrapper that auto-converts cursors
          const collection = database.collection(collectionName);
          
          const collectionWrapper: any = {};
          
          // Wrap common methods
          collectionWrapper.find = async function(query: any = {}, options?: any) {
            const cursor = collection.find(query, options);
            return await cursor.toArray();
          };
          
          collectionWrapper.findOne = async function(query: any = {}, options?: any) {
            return await collection.findOne(query, options);
          };
          
          collectionWrapper.insertOne = async function(doc: any, options?: any) {
            return await collection.insertOne(doc, options);
          };
          
          collectionWrapper.insertMany = async function(docs: any[], options?: any) {
            return await collection.insertMany(docs, options);
          };
          
          collectionWrapper.updateOne = async function(filter: any, update: any, options?: any) {
            return await collection.updateOne(filter, update, options);
          };
          
          collectionWrapper.updateMany = async function(filter: any, update: any, options?: any) {
            return await collection.updateMany(filter, update, options);
          };
          
          collectionWrapper.deleteOne = async function(filter: any, options?: any) {
            return await collection.deleteOne(filter, options);
          };
          
          collectionWrapper.deleteMany = async function(filter: any, options?: any) {
            return await collection.deleteMany(filter, options);
          };
          
          collectionWrapper.countDocuments = async function(query: any = {}, options?: any) {
            return await collection.countDocuments(query, options);
          };
          
          collectionWrapper.aggregate = async function(pipeline: any[], options?: any) {
            const cursor = collection.aggregate(pipeline, options);
            return await cursor.toArray();
          };
          
          return collectionWrapper;
        }
        
        return target[collectionName as unknown as string];
      }
    });

    // Collection helper for backward compatibility
    const collection = (name: string) => {
      const coll = database.collection(name);
      return {
        find: async (query: any = {}, options?: any) => await coll.find(query, options).toArray(),
        findOne: async (query: any = {}, options?: any) => await coll.findOne(query, options),
        insertOne: async (doc: any, options?: any) => await coll.insertOne(doc, options),
        insertMany: async (docs: any[], options?: any) => await coll.insertMany(docs, options),
        updateOne: async (filter: any, update: any, options?: any) => await coll.updateOne(filter, update, options),
        updateMany: async (filter: any, update: any, options?: any) => await coll.updateMany(filter, update, options),
        deleteOne: async (filter: any, options?: any) => await coll.deleteOne(filter, options),
        deleteMany: async (filter: any, options?: any) => await coll.deleteMany(filter, options),
        countDocuments: async (query: any = {}, options?: any) => await coll.countDocuments(query, options),
        aggregate: async (pipeline: any[], options?: any) => await coll.aggregate(pipeline, options).toArray(),
      };
    };

    // Capture logs
    const logs: any[] = [];
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args: any[]) => {
      logs.push(args.length === 1 ? args[0] : args);
    };
    console.error = (...args: any[]) => {
      logs.push({ error: args.length === 1 ? args[0] : args });
    };

    const scriptContent = fs.readFileSync(config.scriptPath, 'utf-8');
    
    // Create async function with improved db and collection helper exposed
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const scriptFn = new AsyncFunction('db', 'collection', scriptContent);
    
    const result = await scriptFn(dbProxy, collection);

    // Restore console and output result
    console.log = originalLog;
    console.error = originalError;

    const output = {
      success: true,
      result: result || (logs.length > 0 ? logs[logs.length - 1] : { success: true }),
      logs: logs
    };
    
    process.stdout.write(JSON.stringify(output));
    
  } catch (error: any) {
    const output = {
      success: false,
      error: error.message || 'Script execution failed',
    };
    
    process.stdout.write(JSON.stringify(output));
    process.exit(1);
    
  } finally {
    await client.close();
  }
}

export function handleStartupError(err: Error) {
  process.stderr.write(JSON.stringify({ error: err.message }));
  process.exit(1);
}

export function main() {
  run().catch(handleStartupError);
}

// Only run when executed directly (not when imported for testing)
if (require.main === module) {
  main();
}
