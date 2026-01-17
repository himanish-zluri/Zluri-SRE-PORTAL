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

    // Create a proxy for db that automatically converts cursors to arrays
    const db = new Proxy(database, {
      get(target, prop) {
        if (typeof prop === 'string') {
          // Return collection proxy
          return new Proxy(target.collection(prop), {
            get(collectionTarget, collectionProp) {
              const method = collectionTarget[collectionProp as keyof typeof collectionTarget];
              if (typeof method === 'function') {
                return function(...args: any[]) {
                  const result = method.apply(collectionTarget, args);
                  // If it's a cursor, auto-convert to array
                  if (result && typeof result.toArray === 'function') {
                    return result.toArray();
                  }
                  return result;
                };
              }
              return method;
            }
          });
        }
        return target[prop as keyof typeof target];
      }
    });

    // Also provide collection helper
    const collection = (name: string) => database.collection(name);
    
    // Create async function with proper error handling
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const fn = new AsyncFunction(
      'db',
      'collection',
      `
        try {
          return await (${queryText});
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
