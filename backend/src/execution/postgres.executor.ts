import { Pool } from 'pg';

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
  });

  try {
    const result = await pool.query(queryText);
    return {
      rows: result.rows,
      rowCount: result.rowCount,
    };
  } finally {
    await pool.end();
  }
}
