import { MongoClient, Db } from 'mongodb';
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

    // Execute script directly without VM sandbox (vm2 has issues with MongoDB)
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    
    const scriptFn = new AsyncFunction('db', 'collection', scriptContent);
    
    // Helper to get collection
    const collection = (name: string) => db.collection(name);
    
    // Capture console.log output
    const logs: any[] = [];
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      logs.push(args.length === 1 ? args[0] : args);
    };

    try {
      const result = await scriptFn(db, collection);
      console.log = originalLog;
      
      return result || (logs.length > 0 ? logs[logs.length - 1] : { success: true });
    } finally {
      console.log = originalLog;
    }

  } finally {
    await client.close();
  }
}
