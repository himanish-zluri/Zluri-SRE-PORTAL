import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 20,                        // max connections in pool
  idleTimeoutMillis: 30000,       // close idle connections after 30s
  connectionTimeoutMillis: 2000   // fail fast if can't connect
});
