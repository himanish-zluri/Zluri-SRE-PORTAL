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

    // Very simple approach - just create basic db object
    const db = {
      logs: {
        find: (query: any = {}) => database.collection('logs').find(query).toArray(),
        findOne: (query: any = {}) => database.collection('logs').findOne(query),
        insertOne: (doc: any) => database.collection('logs').insertOne(doc),
        insertMany: (docs: any[]) => database.collection('logs').insertMany(docs),
        updateOne: (filter: any, update: any) => database.collection('logs').updateOne(filter, update),
        deleteOne: (filter: any) => database.collection('logs').deleteOne(filter),
        countDocuments: (query: any = {}) => database.collection('logs').countDocuments(query),
      },
      products: {
        find: (query: any = {}) => database.collection('products').find(query).toArray(),
        findOne: (query: any = {}) => database.collection('products').findOne(query),
        insertOne: (doc: any) => database.collection('products').insertOne(doc),
        insertMany: (docs: any[]) => database.collection('products').insertMany(docs),
        updateOne: (filter: any, update: any) => database.collection('products').updateOne(filter, update),
        deleteOne: (filter: any) => database.collection('products').deleteOne(filter),
        countDocuments: (query: any = {}) => database.collection('products').countDocuments(query),
      }
    };

    // Collection helper
    const collection = (name: string) => ({
      find: (query: any = {}) => database.collection(name).find(query).toArray(),
      findOne: (query: any = {}) => database.collection(name).findOne(query),
      insertOne: (doc: any) => database.collection(name).insertOne(doc),
      insertMany: (docs: any[]) => database.collection(name).insertMany(docs),
      updateOne: (filter: any, update: any) => database.collection(name).updateOne(filter, update),
      deleteOne: (filter: any) => database.collection(name).deleteOne(filter),
      countDocuments: (query: any = {}) => database.collection(name).countDocuments(query),
    });
    
    // Execute the query
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const fn = new AsyncFunction('db', 'collection', `return await (${queryText});`);
    
    const result = await fn(db, collection);
    return result;

  } finally {
    await client.close();
  }
}