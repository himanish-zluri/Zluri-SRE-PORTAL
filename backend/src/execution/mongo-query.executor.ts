import { MongoClient } from 'mongodb';

export async function executeMongoQuery(
  mongoUri: string,
  databaseName: string,
  queryText: string
) {
  const client = new MongoClient(mongoUri);

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
    
    const fn = new Function(
      'db',
      'collection',
      `
        return (async () => {
          const result = await (${queryText});
          // If result has toArray method (cursor), convert it
          if (result && typeof result.toArray === 'function') {
            return await result.toArray();
          }
          return result;
        })();
      `
    );

    const result = await fn(db, collection);
    return result;

  } finally {
    await client.close();
  }
}
