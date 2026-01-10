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
     * We expose ONLY `db` to the evaluated code.
     * This mimics mongosh but inside Node.
     */
    const fn = new Function(
      'db',
      `
        return (async () => {
          ${queryText}
        })();
      `
    );

    const result = await fn(db);
    return result;

  } finally {
    await client.close();
  }
}
