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
    const db = client.db(databaseName);

    /**
     * VERY IMPORTANT:
     * We expose `db` and a `collection` helper to the evaluated code.
     * This mimics mongosh but inside Node.
     * 
     * The query should return a value. If it returns a cursor, we convert to array.
     */
    const collection = (name: string) => db.collection(name);
    
    // Create async function with proper error handling
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const fn = new AsyncFunction(
      'db',
      'collection',
      `
        try {
          const result = await (${queryText});
          // If result has toArray method (cursor), convert it
          if (result && typeof result.toArray === 'function') {
            return await result.toArray();
          }
          return result;
        } catch (error) {
          throw new Error('Query execution failed: ' + error.message);
        }
      `
    );

    const result = await fn(db, collection);
    return result;

  } finally {
    await client.close();
  }
}
