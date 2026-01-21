# Query Error Handling Improvements

## Problem
Previously, when database queries failed (due to syntax errors, connection issues, constraint violations, etc.), the system was throwing generic 500 Internal Server Errors instead of providing appropriate HTTP status codes and meaningful error messages to users.

## Solution
Implemented proper error categorization and handling throughout the query execution pipeline to return appropriate HTTP status codes based on the type of error.

## Changes Made

### 1. New Error Class
- **Created `QueryExecutionError`** (`backend/src/errors/QueryExecutionError.ts`)
  - HTTP Status: 422 Unprocessable Entity
  - Used for: SQL syntax errors, constraint violations, invalid queries, authentication failures, etc.
  - These are client-side errors that users can potentially fix

### 2. Updated Query Executors

#### Postgres Query Executor (`postgres-query.executor.ts`)
- **Connection Errors** → `InternalError` (500)
  - DNS resolution failures (ENOTFOUND)
  - Connection refused (ECONNREFUSED)
  - SSL connection issues
  - Network timeouts
- **Query Errors** → `QueryExecutionError` (422)
  - SQL syntax errors (42601, 42703, 42P01, etc.)
  - Constraint violations (23505, 23503, 23502, 23514)
  - Authentication failures (28000, 28P01)
  - Database not found (3D000)
  - Query timeouts

#### MongoDB Query Executor (`mongo-query.executor.ts`)
- **Connection Errors** → `InternalError` (500)
  - MongoNetworkError, MongoServerSelectionError
  - DNS resolution failures
- **Query Errors** → `QueryExecutionError` (422)
  - Duplicate key errors (11000)
  - Document validation failures (121)
  - Invalid query syntax (2, 9, 14, 16)
  - Authentication failures (13, 18)
  - Namespace not found (26)
  - JavaScript syntax errors in queries

#### Sandbox Executor (`sandbox/executor.ts`)
- **System Errors** → `InternalError` (500)
  - Failed to start sandbox process
  - Database connection failures
- **Script Errors** → `QueryExecutionError` (422)
  - Script timeouts
  - JavaScript syntax errors
  - SQL/MongoDB query errors within scripts

### 3. Error Handler Middleware
- Updated to import and handle the new `QueryExecutionError`
- Maintains existing error handling for other error types
- Provides consistent JSON error responses with appropriate HTTP status codes

## Error Response Format

### Query Execution Errors (422)
```json
{
  "status": "error",
  "code": "QUERY_EXECUTION_ERROR",
  "message": "SQL Error: column 'invalid_column' does not exist"
}
```

### Internal Server Errors (500)
```json
{
  "status": "error",
  "code": "INTERNAL_ERROR",
  "message": "Database connection failed: getaddrinfo ENOTFOUND invalid-host"
}
```

## Benefits

1. **Better User Experience**: Users now receive meaningful error messages they can act upon
2. **Proper HTTP Status Codes**: 
   - 422 for client errors (fixable by user)
   - 500 for server errors (infrastructure issues)
3. **Improved Debugging**: Clear categorization helps developers identify whether issues are client-side or server-side
4. **API Consistency**: All query-related errors now follow the same error response format
5. **Frontend Integration**: Frontend can now handle different error types appropriately (show user-friendly messages for 422, show generic error for 500)

## Usage Examples

### Before (All errors returned 500)
```
POST /api/queries/123/approve
Response: 500 Internal Server Error
{
  "status": "error",
  "code": "INTERNAL_ERROR", 
  "message": "Internal Server Error"
}
```

### After (Proper error categorization)
```
POST /api/queries/123/approve
Response: 422 Unprocessable Entity
{
  "status": "error",
  "code": "QUERY_EXECUTION_ERROR",
  "message": "SQL Error: column 'user_id' does not exist"
}
```

This allows the frontend to show a helpful message like "There's an error in your SQL query: column 'user_id' does not exist" instead of a generic "Something went wrong" message.