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

async function run() {
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

  const client = new MongoClient(config.mongoUri);

  try {
    await client.connect();
    const db = client.db(config.databaseName);

    // Collection helper for scripts
    const collection = (name: string) => db.collection(name);

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
    
    // Create async function with db and collection helper exposed
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const scriptFn = new AsyncFunction('db', 'collection', scriptContent);
    
    const result = await scriptFn(db, collection);

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

run().catch(err => {
  process.stderr.write(JSON.stringify({ error: err.message }));
  process.exit(1);
});
