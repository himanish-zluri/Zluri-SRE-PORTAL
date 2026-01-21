import { AppError } from './AppError';

/**
 * 422 Unprocessable Entity - Query execution failed due to query issues
 * Use when: SQL syntax errors, invalid queries, constraint violations, etc.
 */
export class QueryExecutionError extends AppError {
  constructor(message: string = 'Query execution failed') {
    super(message, 422, 'QUERY_EXECUTION_ERROR');
  }
}