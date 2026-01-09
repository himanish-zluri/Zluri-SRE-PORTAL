import { Pool } from 'pg';
import fs from 'fs';

export async function executeScript(
  scriptPath: string,
  env: Record<string, string>
): Promise<{ stdout: string; stderr: string }> {
  const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
  
  // Create PG client with provided credentials
  const pool = new Pool({
    host: env.PG_HOST,
    port: Number(env.PG_PORT),
    user: env.PG_USER,
    password: env.PG_PASSWORD,
    database: env.PG_DATABASE
  });

  const client = await pool.connect();
  
  const logs: string[] = [];

  // Helper function for queries
  const query = async (sql: string, params?: any[]) => {
    const result = await client.query(sql, params);
    return result.rows;
  };

  // Capture console.log output
  const originalLog = console.log;
  const originalError = console.error;
  
  console.log = (...args: any[]) => {
    logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
  };
  
  console.error = (...args: any[]) => {
    logs.push('[ERROR] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
  };

  try {
    // Execute script directly without VM sandbox
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const scriptFn = new AsyncFunction('client', 'query', scriptContent);
    
    await scriptFn(client, query);
    
    return { stdout: logs.join('\n'), stderr: '' };
  } catch (error: any) {
    throw new Error(error.message || 'Script execution failed');
  } finally {
    console.log = originalLog;
    console.error = originalError;
    client.release();
    await pool.end();
  }
}
