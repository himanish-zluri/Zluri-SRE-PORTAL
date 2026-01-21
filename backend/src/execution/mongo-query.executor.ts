import { MongoClient } from 'mongodb';
import { QueryExecutionError, InternalError } from '../errors';

const QUERY_TIMEOUT_MS = 30000; // 30 seconds

export async function executeMongoQuery(
  mongoUri: string,
  databaseName: string,
  queryText: string
) {
  const client = new MongoClient(mongoUri, {
    connectTimeoutMS: 10000,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: QUERY_TIMEOUT_MS, // Add socket timeout for query execution
  });

  try {
    await client.connect();
    const database = client.db(databaseName);

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

    // Also provide collection helper function for backward compatibility
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
    
    // Execute the query with timeout protection using Promise.race
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    
    // Remove trailing semicolon for MongoDB queries to prevent syntax errors
    const cleanQueryText = queryText.trim().replace(/;+$/, '');
    
    const fn = new AsyncFunction('db', 'collection', `
      try {
        return await (${cleanQueryText});
      } catch (error) {
        throw new Error('MongoDB query failed: ' + error.message);
      }
    `);
    
    const result = await Promise.race([
      fn(dbProxy, collection),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Query execution timed out after ${QUERY_TIMEOUT_MS / 1000} seconds`)), QUERY_TIMEOUT_MS)
      )
    ]);
    
    return result;

  } catch (error: any) {
    // Handle different types of MongoDB errors
    if (error.message?.includes('timed out')) {
      throw new QueryExecutionError(`Query execution timed out after ${QUERY_TIMEOUT_MS / 1000} seconds`);
    }
    
    // MongoDB specific errors
    if (error.code) {
      switch (error.code) {
        case 11000: // duplicate key error
          throw new QueryExecutionError(`Duplicate key error: ${error.message}`);
        
        case 121: // document validation failure
          throw new QueryExecutionError(`Document validation failed: ${error.message}`);
        
        case 2: // bad value
        case 9: // failed to parse
        case 14: // type mismatch
        case 16: // invalid options
          throw new QueryExecutionError(`Invalid query: ${error.message}`);
        
        case 13: // unauthorized
        case 18: // authentication failed
          throw new QueryExecutionError(`Authentication failed: ${error.message}`);
        
        case 26: // namespace not found (database/collection doesn't exist)
          throw new QueryExecutionError(`Database or collection not found: ${error.message}`);
        
        default:
          // For other MongoDB errors, treat as query execution errors
          throw new QueryExecutionError(`Database error: ${error.message}`);
      }
    }
    
    // Connection errors
    if (error.name === 'MongoNetworkError' || error.name === 'MongoServerSelectionError') {
      throw new InternalError(`Database connection failed: ${error.message}`);
    }
    
    // JavaScript syntax errors in query
    if (error instanceof SyntaxError) {
      throw new QueryExecutionError(`Query syntax error: ${error.message}`);
    }
    
    // MongoDB query execution errors
    if (error.message?.includes('MongoDB query failed')) {
      throw new QueryExecutionError(error.message);
    }
    
    // Generic query execution error
    throw new QueryExecutionError(`Query execution failed: ${error.message}`);
  } finally {
    await client.close();
  }
}
