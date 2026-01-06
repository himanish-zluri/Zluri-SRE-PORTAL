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
  'QUERY'
);

-- =========================
-- USERS
-- =========================
-- Represents any person who can log in
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT CHECK (role IN ('DEVELOPER', 'MANAGER', 'ADMIN')) NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- =========================
-- PODS
-- =========================
-- Each POD has exactly one manager
-- One manager can manage multiple PODs
CREATE TABLE pods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  manager_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT now()
);

-- =========================
-- DB INSTANCES
-- =========================
-- Represents PostgreSQL instances where queries can run
CREATE TABLE db_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  host TEXT NOT NULL,
  port INT NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- =========================
-- QUERY REQUESTS
-- =========================
-- Represents the full lifecycle of a query request
CREATE TABLE query_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  requester_id UUID NOT NULL REFERENCES users(id),
  pod_id TEXT NOT NULL REFERENCES pods(id),

  instance_id UUID NOT NULL REFERENCES db_instances(id),
  database_name TEXT NOT NULL,

  submission_type submission_type NOT NULL,
  query_text TEXT NOT NULL,
  comments TEXT NOT NULL,

  status request_status NOT NULL DEFAULT 'PENDING',

  approved_by UUID REFERENCES users(id),
  rejection_reason TEXT,

  execution_result JSONB,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
