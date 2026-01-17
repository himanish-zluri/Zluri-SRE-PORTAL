-- Full Setup Script for Zluri SRE Portal
-- Run this in Neon SQL Editor or via psql

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================
-- ENUMS
-- =========================
CREATE TYPE request_status AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'EXECUTED',
  'FAILED'
);

CREATE TYPE submission_type AS ENUM (
  'QUERY',
  'SCRIPT'
);

-- =========================
-- USERS
-- =========================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT CHECK (role IN ('DEVELOPER', 'MANAGER', 'ADMIN')) NOT NULL,
  slack_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT now()
);

-- =========================
-- PODS
-- =========================
CREATE TABLE pods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  manager_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT now()
);

-- =========================
-- DB INSTANCES
-- =========================
CREATE TABLE db_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'POSTGRES' CHECK (type IN ('POSTGRES', 'MONGODB')),
  host TEXT,
  port INT,
  username TEXT,
  password TEXT,
  mongo_uri TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- =========================
-- QUERY REQUESTS
-- =========================
CREATE TABLE query_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES users(id),
  pod_id TEXT NOT NULL REFERENCES pods(id),
  instance_id UUID NOT NULL REFERENCES db_instances(id),
  database_name TEXT NOT NULL,
  submission_type submission_type NOT NULL,
  query_text TEXT NOT NULL,
  script_content TEXT,
  comments TEXT NOT NULL,
  status request_status NOT NULL DEFAULT 'PENDING',
  approved_by UUID REFERENCES users(id),
  rejection_reason TEXT,
  execution_result JSONB,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- =========================
-- QUERY AUDIT LOG
-- =========================
CREATE TABLE query_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_request_id UUID NOT NULL REFERENCES query_requests(id),
  action TEXT NOT NULL CHECK (action IN ('SUBMITTED', 'APPROVED', 'REJECTED', 'EXECUTED', 'FAILED')),
  performed_by UUID NOT NULL REFERENCES users(id),
  details JSONB,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_audit_log_query_id ON query_audit_log(query_request_id);
CREATE INDEX idx_audit_log_action ON query_audit_log(action);
CREATE INDEX idx_audit_log_created_at ON query_audit_log(created_at);

-- =========================
-- REFRESH TOKENS
-- =========================
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
abase Setup Script for Zluri SRE Portal
-- Run this in Supabase SQL Editor

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================
-- ENUMS
-- =========================
CREATE TYPE request_status AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'EXECUTED',
  'FAILED'
);

CREATE TYPE submission_type AS ENUM (
  'QUERY',
  'SCRIPT'
);

-- =========================
-- USERS
-- =========================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT CHECK (role IN ('DEVELOPER', 'MANAGER', 'ADMIN')) NOT NULL,
  slack_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT now()
);

-- =========================
-- PODS
-- =========================
CREATE TABLE pods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  manager_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT now()
);

-- =========================
-- DB INSTANCES
-- =========================
CREATE TABLE db_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'POSTGRES' CHECK (type IN ('POSTGRES', 'MONGODB')),
  host TEXT,
  port INT,
  username TEXT,
  password TEXT,
  mongo_uri TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- =========================
-- QUERY REQUESTS
-- =========================
CREATE TABLE query_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES users(id),
  pod_id TEXT NOT NULL REFERENCES pods(id),
  instance_id UUID NOT NULL REFERENCES db_instances(id),
  database_name TEXT NOT NULL,
  submission_type submission_type NOT NULL,
  query_text TEXT NOT NULL,
  script_content TEXT,
  comments TEXT NOT NULL,
  status request_status NOT NULL DEFAULT 'PENDING',
  approved_by UUID REFERENCES users(id),
  rejection_reason TEXT,
  execution_result JSONB,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- =========================
-- QUERY AUDIT LOG
-- =========================
CREATE TABLE query_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_request_id UUID NOT NULL REFERENCES query_requests(id),
  action TEXT NOT NULL CHECK (action IN ('SUBMITTED', 'APPROVED', 'REJECTED', 'EXECUTED', 'FAILED')),
  performed_by UUID NOT NULL REFERENCES users(id),
  details JSONB,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_audit_log_query_id ON query_audit_log(query_request_id);
CREATE INDEX idx_audit_log_action ON query_audit_log(action);
CREATE INDEX idx_audit_log_created_at ON query_audit_log(created_at);

-- =========================
-- REFRESH TOKENS
-- =========================
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
