import { MongoClient } from 'mongodb';
import { NodeVM } from 'vm2';
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

    let result: any;

    // Create sandboxed VM
    const vm = new NodeVM({
      console: 'redirect',
      sandbox: {
        db: db // Inject only the database connection
      },
      require: {
        external: false, // No external requires allowed
        builtin: ['util']
      },
      timeout: 30000 // 30 second timeout
    });

    // Capture result from console.log
    vm.on('console.log', (...args: any[]) => {
      result = args.length === 1 ? args[0] : args;
    });

    // Wrap script to capture return value
    const wrappedScript = `
      (async () => {
        ${scriptContent}
      })();
    `;

    const scriptResult = await vm.run(wrappedScript, scriptPath);
    return scriptResult || result;

  } finally {
    await client.close();
  }
}
