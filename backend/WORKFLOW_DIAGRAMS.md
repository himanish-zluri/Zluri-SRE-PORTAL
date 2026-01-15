# SRE Portal - Workflow Diagrams

## 1. High-Level System Architecture

```mermaid
flowchart TB
    subgraph Frontend["Frontend (React + Vite)"]
        UI[User Interface]
        Auth[Auth Context]
        API[API Service]
    end
    
    subgraph Backend["Backend (Express + TypeScript)"]
        Routes[API Routes]
        MW[Auth Middleware]
        Controllers[Controllers]
        Services[Services]
        Repos[Repositories]
    end
    
    subgraph Execution["Script Execution"]
        Sandbox[Sandbox Executor]
        Child[Child Process Fork]
    end
    
    subgraph Databases["Databases"]
        AppDB[(App PostgreSQL)]
        TargetPG[(Target PostgreSQL)]
        TargetMongo[(Target MongoDB)]
    end
    
    UI --> API
    API --> Routes
    Routes --> MW
    MW --> Controllers
    Controllers --> Services
    Services --> Repos
    Repos --> AppDB
    Services --> Sandbox
    Sandbox --> Child
    Child --> TargetPG
    Child --> TargetMongo
```

---

## 2. Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant DB as Database
    
    Note over U,DB: Login Flow
    U->>F: Enter email/password
    F->>B: POST /api/auth/login
    B->>DB: Find user by email
    DB-->>B: User record
    B->>B: Verify password (bcrypt)
    B->>B: Generate Access Token (JWT, 15m)
    B->>B: Generate Refresh Token (random)
    B->>B: Hash refresh token (SHA-256)
    B->>DB: Store hashed refresh token
    B-->>F: {accessToken, refreshToken, user}
    F->>F: Store tokens in localStorage
    F-->>U: Redirect to Dashboard
    
    Note over U,DB: Token Refresh Flow (on 401)
    F->>B: API call with expired token
    B-->>F: 401 Unauthorized
    F->>B: POST /api/auth/refresh
    B->>B: Hash incoming refresh token
    B->>DB: Find by token hash
    DB-->>B: Token record
    B->>B: Generate new Access Token
    B-->>F: {accessToken, user}
    F->>F: Update localStorage
    F->>B: Retry original request
```

---

## 3. Query Submission Workflow

```mermaid
flowchart TD
    A[Developer] -->|Submit Query| B{Submission Type?}
    
    B -->|SQL Query| C[Enter Query Text]
    B -->|Script| D[Upload .js File]
    
    C --> E[Select Instance]
    D --> E
    
    E --> F[Select Database]
    F --> G[Select Pod]
    G --> H[Add Comments]
    H --> I[Submit]
    
    I --> J[Backend Validation]
    J --> K[Store in DB]
    K --> L[Status: PENDING]
    L --> M[Log to Audit]
    
    M --> N[Notify Pod Manager]
    
    style A fill:#e1f5fe
    style L fill:#fff3e0
    style M fill:#f3e5f5
```

---

## 4. Query Approval/Execution Workflow

```mermaid
flowchart TD
    A[Manager Views Pending Queries] --> B{Decision}
    
    B -->|Approve| C[Fetch Query Details]
    B -->|Reject| R[Enter Rejection Reason]
    
    R --> R1[Update Status: REJECTED]
    R1 --> R2[Log to Audit]
    R2 --> R3[Notify Developer]
    
    C --> D{Instance Type?}
    
    D -->|PostgreSQL| E{Submission Type?}
    D -->|MongoDB| F{Submission Type?}
    
    E -->|Query| G[Execute via pg client]
    E -->|Script| H[Fork Child Process]
    
    F -->|Query| I[Execute via MongoDB client]
    F -->|Script| J[Fork Child Process]
    
    H --> K[postgres-script.executor.ts]
    J --> L[mongo-script.executor.ts]
    
    G --> M{Success?}
    I --> M
    K --> M
    L --> M
    
    M -->|Yes| N[Status: EXECUTED]
    M -->|No| O[Status: FAILED]
    
    N --> P[Store Result]
    O --> Q[Store Error]
    
    P --> S[Log to Audit]
    Q --> S
    
    style N fill:#c8e6c9
    style O fill:#ffcdd2
    style R1 fill:#ffcdd2
```

---

## 5. Script Sandbox Execution Flow

```mermaid
sequenceDiagram
    participant S as Query Service
    participant E as Executor
    participant F as Fork (Child Process)
    participant DB as Target Database
    
    S->>E: executePostgresScriptSandboxed(path, config)
    E->>E: Resolve runner path
    E->>F: fork(runner.ts, [config])
    
    Note over F: Child Process (Isolated)
    F->>F: Parse config from argv
    F->>F: Create DB connection
    F->>F: Read script file
    F->>F: Create AsyncFunction
    F->>DB: Execute script
    DB-->>F: Results
    F->>F: Capture console.log
    F-->>E: stdout: JSON {success, result, logs}
    
    Note over E: Timeout Handling
    E->>E: Set 30s timeout
    alt Script completes
        E->>E: Clear timeout
        E-->>S: Return result
    else Timeout exceeded
        E->>F: SIGKILL
        E-->>S: Throw timeout error
    end
```

---

## 6. Role-Based Access Control

```mermaid
flowchart LR
    subgraph Roles
        DEV[DEVELOPER]
        MGR[MANAGER]
        ADM[ADMIN]
    end
    
    subgraph Permissions
        P1[Submit Queries]
        P2[View Own Queries]
        P3[Approve Pod Queries]
        P4[Reject Pod Queries]
        P5[View All Queries]
        P6[Reject Any Query]
        P7[View Audit Logs]
    end
    
    DEV --> P1
    DEV --> P2
    
    MGR --> P1
    MGR --> P2
    MGR --> P3
    MGR --> P4
    
    ADM --> P1
    ADM --> P2
    ADM --> P5
    ADM --> P6
    ADM --> P7
    
    style DEV fill:#e3f2fd
    style MGR fill:#fff3e0
    style ADM fill:#fce4ec
```

---

## 7. Data Flow - Query Lifecycle

```mermaid
stateDiagram-v2
    [*] --> PENDING: Submit Query
    
    PENDING --> EXECUTED: Manager Approves
    PENDING --> REJECTED: Manager Rejects
    PENDING --> FAILED: Execution Error
    
    EXECUTED --> [*]
    REJECTED --> [*]
    FAILED --> [*]
    
    note right of PENDING
        Waiting for manager approval
    end note
    
    note right of EXECUTED
        Query ran successfully
        Result stored in DB
    end note
    
    note right of REJECTED
        Manager rejected with reason
    end note
    
    note right of FAILED
        Execution threw error
        Error message stored
    end note
```

---

## 8. Database Schema Relationships

```mermaid
erDiagram
    USERS ||--o{ QUERY_REQUESTS : submits
    USERS ||--o{ PODS : manages
    USERS ||--o{ REFRESH_TOKENS : has
    
    PODS ||--o{ QUERY_REQUESTS : receives
    
    DB_INSTANCES ||--o{ QUERY_REQUESTS : targets
    DB_INSTANCES ||--o{ DB_INSTANCE_DATABASES : contains
    
    QUERY_REQUESTS ||--o{ QUERY_AUDIT_LOG : generates
    
    USERS {
        uuid id PK
        string email UK
        string name
        string password_hash
        string role
    }
    
    PODS {
        string id PK
        string name
        uuid manager_id FK
    }
    
    DB_INSTANCES {
        uuid id PK
        string name
        string type
        string host
        int port
        string username
        string password_encrypted
        string mongo_uri_encrypted
    }
    
    QUERY_REQUESTS {
        uuid id PK
        uuid requester_id FK
        string pod_id FK
        uuid instance_id FK
        string database_name
        string query_text
        string submission_type
        string script_path
        string status
        json execution_result
    }
    
    QUERY_AUDIT_LOG {
        uuid id PK
        uuid query_request_id FK
        string action
        uuid performed_by FK
        json details
    }
```

---

## 9. Security Architecture

```mermaid
flowchart TB
    subgraph Client["Client Side"]
        AT[Access Token<br/>localStorage]
        RT[Refresh Token<br/>localStorage]
    end
    
    subgraph Transport["Transport"]
        HTTPS[HTTPS Only]
    end
    
    subgraph Server["Server Side"]
        JWT[JWT Verification]
        RBAC[Role-Based Access]
        
        subgraph Encryption["Data Protection"]
            PWD[Passwords<br/>bcrypt hash]
            RTH[Refresh Tokens<br/>SHA-256 hash]
            CRED[DB Credentials<br/>AES-256-GCM]
        end
        
        subgraph Isolation["Process Isolation"]
            FORK[Child Process Fork]
            ENV[Limited Environment]
            TIMEOUT[30s Timeout + SIGKILL]
        end
    end
    
    AT --> HTTPS
    RT --> HTTPS
    HTTPS --> JWT
    JWT --> RBAC
    RBAC --> Encryption
    RBAC --> Isolation
```

---

## 10. API Request Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant R as Router
    participant A as Auth Middleware
    participant Ctrl as Controller
    participant Svc as Service
    participant Repo as Repository
    participant DB as Database
    
    C->>R: HTTP Request + Bearer Token
    R->>A: Validate Token
    
    alt Token Valid
        A->>A: Decode JWT
        A->>A: Attach user to request
        A->>Ctrl: Next()
        Ctrl->>Svc: Business Logic
        Svc->>Repo: Data Access
        Repo->>DB: SQL Query
        DB-->>Repo: Results
        Repo-->>Svc: Data
        Svc-->>Ctrl: Processed Data
        Ctrl-->>C: 200 OK + JSON
    else Token Invalid/Expired
        A-->>C: 401 Unauthorized
    else Insufficient Role
        A-->>C: 403 Forbidden
    end
```

---

## How to Use in Notion

1. Create a new Notion page
2. Type `/code` and select "Code" block
3. Set language to "Mermaid"
4. Paste each diagram code
5. Notion will render the diagram automatically

Alternatively, use Notion's built-in diagram tools or embed from Mermaid Live Editor (https://mermaid.live)
