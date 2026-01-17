import { MongoClient } from 'mongodb';

export async function executeMongoQuery(
  mongoUri: string,
  databaseName: string,
  queryText: string
) {
  const client = new MongoClient(mongoUri, {
    connectTimeoutMS: 10000,
    serverSelectionTimeoutMS: 10000,
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
          
          collectionWrapper.aggregate = function(pipeline: any[], options?: any) {
            const cursor = collection.aggregate(pipeline, options);
            return cursor.toArray();
          };
          
          return collectionWrapper;
        }
        
        return target[collectionName];
      }
    });

    // Also provide collection helper function for backward compatibility
    const collection = (name: string) => {
      const coll = database.collection(name);
      return {
        find: (query: any = {}, options?: any) => coll.find(query, options).toArray(),
        findOne: (query: any = {}, options?: any) => coll.findOne(query, options),
        insertOne: (doc: any, options?: any) => coll.insertOne(doc, options),
        insertMany: (docs: any[], options?: any) => coll.insertMany(docs, options),
        updateOne: (filter: any, update: any, options?: any) => coll.updateOne(filter, update, options),
        updateMany: (filter: any, update: any, options?: any) => coll.updateMany(filter, update, options),
        deleteOne: (filter: any, options?: any) => coll.deleteOne(filter, options),
        deleteMany: (filter: any, options?: any) => coll.deleteMany(filter, options),
        countDocuments: (query: any = {}, options?: any) => coll.countDocuments(query, options),
        aggregate: (pipeline: any[], options?: any) => coll.aggregate(pipeline, options).toArray(),
      };
    };
    
    // Execute the query with proper async handling
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const fn = new AsyncFunction('db', 'collection', `
      try {
        return await (${queryText});
      } catch (error) {
        throw new Error('MongoDB query failed: ' + error.message);
      }
    `);
    
    const result = await fn(dbProxy, collection);
    return result;

  } finally {
    await client.close();
  }
}
