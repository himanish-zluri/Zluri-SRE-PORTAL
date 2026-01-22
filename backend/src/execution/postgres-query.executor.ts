import { Pool } from 'pg';
import { QueryExecutionError, InternalError } from '../errors';

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
  } catch (error: any) {
    // Network/connection errors (check code and message for DNS/connection errors first)
    if (error.code === 'ECONNREFUSED' || 
        error.code === 'ENOTFOUND' || 
        error.code === 'ETIMEDOUT' ||
        error.message?.includes('ENOTFOUND') ||
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('does not support SSL')) {
      throw new InternalError(`Database connection failed: ${error.message}`);
    }
    
    // Handle timeout errors (after checking for network errors)
    if (error.message?.includes('timed out')) {
      throw new QueryExecutionError(`Query execution timed out after ${QUERY_TIMEOUT_MS / 1000} seconds`);
    }
    
    // PostgreSQL syntax and query errors
    if (error.code) {
      switch (error.code) {
        case '42601': // syntax_error
        case '42703': // undefined_column
        case '42P01': // undefined_table
        case '42883': // undefined_function
        case '42P02': // undefined_parameter
        case '42804': // datatype_mismatch
          throw new QueryExecutionError(`SQL Error: ${error.message}`);
        
        case '23505': // unique_violation
        case '23503': // foreign_key_violation
        case '23502': // not_null_violation
        case '23514': // check_violation
          throw new QueryExecutionError(`Constraint violation: ${error.message}`);
        
        case '28000': // invalid_authorization_specification
        case '28P01': // invalid_password
          throw new QueryExecutionError(`Authentication failed: ${error.message}`);
        
        case '3D000': // invalid_catalog_name (database does not exist)
          throw new QueryExecutionError(`Database does not exist: ${error.message}`);
        
        case '08001': // sqlclient_unable_to_establish_sqlconnection
        case '08006': // connection_failure
          throw new InternalError(`Database connection failed: ${error.message}`);
        
        default:
          // For other PostgreSQL errors, treat as query execution errors
          throw new QueryExecutionError(`Database error: ${error.message}`);
      }
    }
    
    // Generic query execution error
    throw new QueryExecutionError(`Query execution failed: ${error.message}`);
  } finally {
    await pool.end();
  }
}
