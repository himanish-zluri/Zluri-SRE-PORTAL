import { Pool } from 'pg';

const QUERY_TIMEOUT_MS = 30000; // 30 seconds

export async function executePostgresQuery(
  connection: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  },
  queryText: string
) {
  const pool = new Pool({
    host: connection.host,
    port: connection.port,
    user: connection.username,
    password: connection.password,
    database: connection.database,
    ssl: { rejectUnauthorized: false },
    // Add query timeout at connection level
    query_timeout: QUERY_TIMEOUT_MS,
  });

  try {
    // Add Promise.race for additional timeout protection
    const result = await Promise.race([
      pool.query(queryText),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Query execution timed out after ${QUERY_TIMEOUT_MS / 1000} seconds`)), QUERY_TIMEOUT_MS)
      )
    ]);
    
    return {
      rows: result.rows,
      rowCount: result.rowCount,
    };
  } finally {
    await pool.end();
  }
}
