# API Documentation

Base URL: `http://localhost:3000/api`

## Authentication

All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

---

## Auth Endpoints

### POST /auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "developer@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "a1b2c3d4e5f6...",
  "user": {
    "id": "uuid",
    "email": "developer@example.com",
    "name": "John Doe",
    "role": "DEVELOPER"
  }
}
```

**Error (401):**
```json
{
  "message": "Invalid email or password"
}
```

---

### POST /auth/refresh
Get a new access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "developer@example.com",
    "name": "John Doe",
    "role": "DEVELOPER"
  }
}
```

---

### POST /auth/logout
Invalidate a refresh token.

**Request Body:**
```json
{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

### POST /auth/logout-all
Logout from all devices. **Requires authentication.**

**Response (200):**
```json
{
  "message": "Logged out from all devices"
}
```

---

## Query Endpoints

### GET /queries
List queries based on user role.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| user | string | Use `me` to get only own queries |
| status | string | Comma-separated: `PENDING,APPROVED,REJECTED,EXECUTED,FAILED` |

**Examples:**
```
GET /queries                           # All queries (role-based)
GET /queries?user=me                   # Own queries only
GET /queries?status=PENDING            # Filter by status
GET /queries?user=me&status=PENDING,APPROVED
```

**Response (200):**
```json
[
  {
    "id": "uuid",
    "requester_id": "uuid",
    "instance_id": "uuid",
    "database_name": "production_db",
    "submission_type": "QUERY",
    "query_text": "SELECT * FROM users",
    "comments": "Fetching user data",
    "pod_id": "pod-a",
    "status": "PENDING",
    "script_path": null,
    "script_content": null,
    "approved_by": null,
    "rejection_reason": null,
    "execution_result": null,
    "created_at": "2025-01-12T10:00:00.000Z",
    "updated_at": "2025-01-12T10:00:00.000Z"
  }
]
```

---

### POST /queries
Submit a new query or script.

**For Query Submission (JSON):**
```json
{
  "instanceId": "uuid",
  "databaseName": "production_db",
  "queryText": "SELECT * FROM users WHERE status = 'active'",
  "podId": "pod-a",
  "comments": "Fetching active users for report",
  "submissionType": "QUERY"
}
```

**For Script Submission (multipart/form-data):**
| Field | Type | Description |
|-------|------|-------------|
| instanceId | string | Database instance UUID |
| databaseName | string | Target database name |
| podId | string | POD identifier |
| comments | string | Description of what script does |
| submissionType | string | Must be `SCRIPT` |
| script | file | JavaScript file (.js, max 2MB) |

**Response (201):**
```json
{
  "id": "uuid",
  "requester_id": "uuid",
  "instance_id": "uuid",
  "database_name": "production_db",
  "submission_type": "QUERY",
  "query_text": "SELECT * FROM users WHERE status = 'active'",
  "status": "PENDING",
  "created_at": "2025-01-12T10:00:00.000Z"
}
```

---

### POST /queries/:id/approve
Approve and execute a query. **Requires MANAGER or ADMIN role.**

**Response (200) - Success:**
```json
{
  "status": "EXECUTED",
  "result": {
    "rows": [
      { "id": 1, "name": "John", "email": "john@example.com" }
    ],
    "rowCount": 1
  }
}
```

**Response (200) - Script Success:**
```json
{
  "status": "EXECUTED",
  "result": {
    "stdout": "Processed 150 records",
    "stderr": ""
  }
}
```

**Response (500) - Execution Failed:**
```json
{
  "message": "Query execution failed",
  "error": "relation \"users\" does not exist"
}
```

---

### POST /queries/:id/reject
Reject a query. **Requires MANAGER or ADMIN role.**

**Request Body:**
```json
{
  "reason": "Query is too broad, please add WHERE clause"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "status": "REJECTED",
  "rejection_reason": "Query is too broad, please add WHERE clause",
  "approved_by": "manager-uuid"
}
```

---

## Database Instance Endpoints

### GET /instances
List database instances.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | Filter by `POSTGRES` or `MONGODB` |

**Examples:**
```
GET /instances                    # All instances
GET /instances?type=POSTGRES      # PostgreSQL only
GET /instances?type=MONGODB       # MongoDB only
```

**Response (200):**
```json
[
  {
    "id": "uuid",
    "name": "Production PostgreSQL",
    "host": "prod-db.example.com",
    "port": 5432,
    "type": "POSTGRES",
    "created_at": "2025-01-01T00:00:00.000Z"
  },
  {
    "id": "uuid",
    "name": "Production MongoDB",
    "type": "MONGODB",
    "created_at": "2025-01-01T00:00:00.000Z"
  }
]
```

---

## Database Endpoints

### GET /databases
List databases in an instance.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| instanceId | string | Yes | Database instance UUID |

**Example:**
```
GET /databases?instanceId=uuid-here
```

**Response (200):**
```json
["app_production", "app_staging", "analytics"]
```

---

## POD Endpoints

### GET /pods
List all PODs.

**Response (200):**
```json
[
  {
    "id": "pod-a",
    "name": "Platform Team",
    "manager_id": "uuid",
    "manager_name": "Jane Manager",
    "created_at": "2025-01-01T00:00:00.000Z"
  }
]
```

---

### GET /pods/:id
Get POD details.

**Response (200):**
```json
{
  "id": "pod-a",
  "name": "Platform Team",
  "manager_id": "uuid",
  "manager_name": "Jane Manager",
  "created_at": "2025-01-01T00:00:00.000Z"
}
```

---

## Audit Endpoints

**All audit endpoints require ADMIN role.**

### GET /audit
List audit logs with optional filters.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 100 | Max records to return |
| offset | number | 0 | Records to skip |
| userId | string | - | Filter by user who performed action |
| queryId | string | - | Filter by query request |
| databaseName | string | - | Filter by target database name |

**Examples:**
```
GET /audit                              # All logs (default pagination)
GET /audit?limit=20&offset=0            # First 20 logs
GET /audit?limit=20&offset=20           # Next 20 logs (page 2)
GET /audit?userId=uuid                  # Logs by specific user
GET /audit?queryId=uuid                 # Logs for specific query
GET /audit?databaseName=production_db   # Logs for specific database
```

**Response (200):**
```json
[
  {
    "id": "uuid",
    "query_request_id": "uuid",
    "action": "SUBMITTED",
    "performed_by": "uuid",
    "performed_by_name": "John Developer",
    "performed_by_email": "john@example.com",
    "details": {
      "submissionType": "QUERY",
      "podId": "pod-a"
    },
    "created_at": "2025-01-12T10:00:00.000Z"
  }
]
```

**Action Types:**
- `SUBMITTED` - Query/script submitted
- `APPROVED` - Query approved (before execution)
- `EXECUTED` - Query executed successfully
- `FAILED` - Query execution failed
- `REJECTED` - Query rejected by manager

---

### GET /audit/query/:queryId
Get audit logs for a specific query.

**Response (200):**
```json
[
  {
    "id": "uuid",
    "action": "SUBMITTED",
    "performed_by_name": "John Developer",
    "created_at": "2025-01-12T10:00:00.000Z"
  },
  {
    "id": "uuid",
    "action": "EXECUTED",
    "performed_by_name": "Jane Manager",
    "created_at": "2025-01-12T10:05:00.000Z"
  }
]
```

---

## Error Responses

### 400 Bad Request
```json
{
  "message": "Email and password are required"
}
```

### 401 Unauthorized
```json
{
  "message": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "message": "Forbidden"
}
```

### 500 Internal Server Error
```json
{
  "message": "Failed to submit query",
  "error": "Database connection failed"
}
```

---

## Script Examples

### PostgreSQL Script
```javascript
// query() helper is pre-injected
const users = await query('SELECT * FROM users WHERE status = $1', ['active']);
console.log(`Found ${users.length} active users`);

const stats = await query('SELECT COUNT(*) as total FROM orders');
console.log(stats);
```

### MongoDB Script
```javascript
// db and collection() are pre-injected
const users = await db.collection('users').find({ status: 'active' }).toArray();
console.log(`Found ${users.length} active users`);

const stats = await collection('orders').aggregate([
  { $group: { _id: '$status', count: { $sum: 1 } } }
]).toArray();
console.log(stats);
```

---

## Rate Limits

No rate limits implemented (internal tool).

## Pagination

Audit endpoints support pagination via `limit` and `offset` query parameters.
Default: `limit=100`, `offset=0`
