/**
 * Postgres Script Runner - Runs in isolated child process
 * 
 * Receives: scriptPath, database config via process.argv
 * Outputs: Results via stdout, errors via stderr
 */
import { Pool } from 'pg';
import fs from 'fs';

interface RunnerConfig {
  scriptPath: string;
  PG_HOST: string;
  PG_PORT: string;
  PG_USER: string;
  PG_PASSWORD: string;
  PG_DATABASE: string;
}

export async function run() {
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

  const pool = new Pool({
    host: config.PG_HOST,
    port: Number(config.PG_PORT),
    user: config.PG_USER,
    password: config.PG_PASSWORD,
    database: config.PG_DATABASE,
  });

  const client = await pool.connect();

  // Query helper for scripts
  const query = async (sql: string, params?: any[]) => {
    const result = await client.query(sql, params);
    return result.rows;
  };

  // Capture logs
  const logs: string[] = [];
  const originalLog = console.log;
  const originalError = console.error;

  console.log = (...args: any[]) => {
    logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
  };
  console.error = (...args: any[]) => {
    logs.push('[ERROR] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
  };

  try {
    const scriptContent = fs.readFileSync(config.scriptPath, 'utf-8');
    
    // Create async function with only query helper exposed
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const scriptFn = new AsyncFunction('query', scriptContent);
    
    const result = await scriptFn(query);

    // Restore console and output result
    console.log = originalLog;
    console.error = originalError;

    const output = {
      success: true,
      result: result,
      logs: logs
    };
    
    // Output to stdout for parent process to capture
    process.stdout.write(JSON.stringify(output));
    
  } catch (error: any) {
    console.log = originalLog;
    console.error = originalError;
    
    const output = {
      success: false,
      error: error.message || 'Script execution failed',
      logs: logs
    };
    
    process.stdout.write(JSON.stringify(output));
    process.exit(1);
    
  } finally {
    client.release();
    await pool.end();
  }
}

export function handleStartupError(err: Error) {
  process.stderr.write(JSON.stringify({ error: err.message }));
  process.exit(1);
}

export function main() {
  run().catch(handleStartupError);
}

// Only run when executed directly (not when imported for testing)
if (require.main === module) {
  main();
}
