# Database Query Portal - Backend

A secure web portal for developers to submit database queries and scripts for execution against production databases, with manager approval workflow.

## Features

- **Authentication**: JWT-based auth with access + refresh tokens
- **Query Submission**: Submit SQL queries or JavaScript scripts
- **Approval Workflow**: Manager approval required before execution
- **Multi-Database Support**: PostgreSQL and MongoDB
- **Sandboxed Execution**: Scripts run in isolated child processes
- **Audit Trail**: Complete logging of all actions
- **Role-Based Access**: Developer, Manager, Admin roles

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (portal data)
- **Target Databases**: PostgreSQL, MongoDB
- **Authentication**: JWT + bcrypt
- **Testing**: Jest (100% coverage)

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run migrations
psql -d your_database -f migrations/001_init.sql
# ... run all migrations in order

# Start development server
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Environment Variables

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=query_portal
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key
```

## API Endpoints

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | No | Login with email/password |
| POST | `/api/auth/refresh` | No | Refresh access token |
| POST | `/api/auth/logout` | No | Logout |
| POST | `/api/auth/logout-all` | Yes | Logout all devices |

### Queries
| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/api/queries` | Yes | Any | List queries |
| GET | `/api/queries?user=me` | Yes | Any | List own queries |
| GET | `/api/queries?status=PENDING` | Yes | Any | Filter by status |
| POST | `/api/queries` | Yes | Any | Submit query/script |
| POST | `/api/queries/:id/approve` | Yes | Manager/Admin | Approve query |
| POST | `/api/queries/:id/reject` | Yes | Manager/Admin | Reject query |

### Database Instances
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/instances` | Yes | List all instances |
| GET | `/api/instances?type=POSTGRES` | Yes | Filter by type |

### Databases
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/databases?instanceId=xxx` | Yes | List databases in instance |

### PODs
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/pods` | Yes | List all PODs |
| GET | `/api/pods/:id` | Yes | Get POD details |

### Audit Logs
| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/api/audit` | Yes | Admin | List audit logs |
| GET | `/api/audit?limit=20&offset=0` | Yes | Admin | With pagination |
| GET | `/api/audit/query/:queryId` | Yes | Admin | Logs for query |

## Project Structure

```
backend/
├── src/
│   ├── config/          # Database configuration
│   ├── constants/       # Role definitions
│   ├── execution/       # Query/script executors
│   │   ├── sandbox/     # Sandboxed script execution
│   │   ├── postgres-query.executor.ts
│   │   └── mongo-query.executor.ts
│   ├── middlewares/     # Auth, file upload
│   ├── modules/
│   │   ├── auth/        # Authentication
│   │   ├── queries/     # Query submission & approval
│   │   ├── db-instances/# Database instance management
│   │   ├── databases/   # Database listing
│   │   ├── pods/        # POD management
│   │   ├── audit/       # Audit logging
│   │   └── users/       # User management
│   └── utils/           # Encryption utilities
├── tests/
│   └── unit/            # Unit tests (mirrors src structure)
├── migrations/          # SQL migrations
└── uploads/             # Uploaded scripts
```

## Script Execution

### PostgreSQL Scripts
```javascript
// query() helper is pre-injected
const users = await query('SELECT * FROM users');
console.log(users);
```

### MongoDB Scripts
```javascript
// db and collection() are pre-injected
const logs = await db.collection('logs').find({}).toArray();
console.log(logs);
```

### Sandbox Features
- **Process Isolation**: Scripts run in separate OS process via `fork()`
- **30-second Timeout**: Automatic termination of stuck scripts
- **Environment Isolation**: No access to server secrets (JWT_SECRET, etc.)
- **Credential Injection**: Database credentials passed securely

## Security

- **Password Hashing**: bcrypt with automatic salting
- **Token Security**: Refresh tokens hashed with SHA256
- **Credential Encryption**: AES-256-GCM for database passwords
- **Process Isolation**: Scripts sandboxed in child processes
- **Role-Based Access**: Enforced at middleware level

## Testing

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# View coverage report
open coverage/index.html
```

**Coverage**: 100% branch coverage across all modules

## User Roles

| Role | Permissions |
|------|-------------|
| DEVELOPER | Submit queries, view own submissions |
| MANAGER | Approve/reject queries for their PODs |
| ADMIN | Full access, view audit logs |

## Workflow

### Complete Flow Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   DEVELOPER     │    │    MANAGER      │    │     ADMIN       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │ 1. Submit Query       │                       │
         │    /Script            │                       │
         ▼                       │                       │
┌─────────────────┐              │                       │
│ Query Created   │              │                       │
│ Status: PENDING │              │                       │
└─────────────────┘              │                       │
         │                       │                       │
         │ 2. Notification       │                       │
         │ ─────────────────────▶│                       │
         │                       │                       │
         │                       │ 3. Review Query       │
         │                       ▼                       │
         │              ┌─────────────────┐              │
         │              │ Manager Decision│              │
         │              └─────────────────┘              │
         │                       │                       │
         │              ┌────────┴────────┐              │
         │              │                 │              │
         │              ▼                 ▼              │
         │     ┌─────────────────┐ ┌─────────────────┐   │
         │     │    APPROVE      │ │     REJECT      │   │
         │     └─────────────────┘ └─────────────────┘   │
         │              │                 │              │
         │              │                 │              │
         │              ▼                 ▼              │
         │   ┌─────────────────┐ ┌─────────────────┐     │
         │   │ Execute in      │ │ Status:         │     │
         │   │ Sandbox         │ │ REJECTED        │     │
         │   └─────────────────┘ └─────────────────┘     │
         │              │                 │              │
         │     ┌────────┴────────┐        │              │
         │     │                 │        │              │
         │     ▼                 ▼        │              │
         │ ┌─────────────┐ ┌─────────────┐│              │
         │ │ Status:     │ │ Status:     ││              │
         │ │ EXECUTED    │ │ FAILED      ││              │
         │ └─────────────┘ └─────────────┘│              │
         │              │                 │              │
         │ 4. Results   │                 │              │
         │ ◀────────────┼─────────────────┘              │
         │              │                                │
         │              │ 5. Audit Logs                 │
         │              │ ──────────────────────────────▶│
         │              │                                │
         ▼              ▼                                ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ View Results    │ │ All Actions     │ │ Monitor System  │
│ & History       │ │ Logged          │ │ via Audit Trail │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### Step-by-Step Process

1. **Developer** submits query/script, selects target database and POD
2. Query stored with status `PENDING`
3. **Manager** reviews in approval dashboard
4. Manager approves → Query executes → Status: `EXECUTED` or `FAILED`
5. Manager rejects → Status: `REJECTED` with reason
6. All actions logged to audit trail

### Key Features in Flow

- **POD-based Approval**: Only managers of the selected POD can approve
- **Sandboxed Execution**: Scripts run in isolated child processes (30s timeout)
- **Complete Audit Trail**: Every action logged with user, timestamp, details
- **Multi-Database Support**: PostgreSQL queries/scripts, MongoDB queries/scripts
- **Security**: Credentials encrypted, tokens expire, process isolation
