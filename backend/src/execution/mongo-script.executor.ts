import { MongoClient } from 'mongodb';
import fs from 'fs';

export async function executeMongoScript(
  scriptPath: string,
  mongoUri: string,
  databaseName: string
) {
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db(databaseName);

    const scriptContent = fs.readFileSync(scriptPath, 'utf-8');

    const fn = new Function(
      'db',
      `
      return (async () => {
        ${scriptContent}
      })();
    `
    );

    const result = await fn(db);
    return result;

  } finally {
    await client.close();
  }
}
