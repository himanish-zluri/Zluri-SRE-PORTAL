-- Seed Data for Zluri SRE Portal
-- Run this AFTER supabase_full_setup.sql

-- =========================
-- USERS (password: password123)
-- =========================
INSERT INTO users (email, name, password_hash, role) VALUES
-- Admins
('admin1@zluri.com', 'Admin One', '$2b$10$OHq1FB7Pt8HLvFD7wUAiveBKX7i8dg491UOgB6TWAlLPraV7CXe2y', 'ADMIN'),
('admin2@zluri.com', 'Admin Two', '$2b$10$OHq1FB7Pt8HLvFD7wUAiveBKX7i8dg491UOgB6TWAlLPraV7CXe2y', 'ADMIN'),
-- Managers
('manager1@zluri.com', 'Manager One', '$2b$10$fJNl9n/GBYhujo8mG9ModOHYtrZ35C3uzaO08etJY5fnNEIRDk6p2', 'MANAGER'),
('manager2@zluri.com', 'Manager Two', '$2b$10$fJNl9n/GBYhujo8mG9ModOHYtrZ35C3uzaO08etJY5fnNEIRDk6p2', 'MANAGER'),
('manager3@zluri.com', 'Manager Three', '$2b$10$fJNl9n/GBYhujo8mG9ModOHYtrZ35C3uzaO08etJY5fnNEIRDk6p2', 'MANAGER'),
-- Developers
('dev1@zluri.com', 'Dev One', '$2b$10$fJNl9n/GBYhujo8mG9ModOHYtrZ35C3uzaO08etJY5fnNEIRDk6p2', 'DEVELOPER'),
('dev2@zluri.com', 'Dev Two', '$2b$10$fJNl9n/GBYhujo8mG9ModOHYtrZ35C3uzaO08etJY5fnNEIRDk6p2', 'DEVELOPER'),
('dev3@zluri.com', 'Dev Three', '$2b$10$fJNl9n/GBYhujo8mG9ModOHYtrZ35C3uzaO08etJY5fnNEIRDk6p2', 'DEVELOPER'),
('dev4@zluri.com', 'Dev Four', '$2b$10$fJNl9n/GBYhujo8mG9ModOHYtrZ35C3uzaO08etJY5fnNEIRDk6p2', 'DEVELOPER'),
('dev5@zluri.com', 'Dev Five', '$2b$10$fJNl9n/GBYhujo8mG9ModOHYtrZ35C3uzaO08etJY5fnNEIRDk6p2', 'DEVELOPER');

-- =========================
-- PODS
-- =========================
INSERT INTO pods (id, name, manager_id) VALUES
('pod-a', 'Pod A', (SELECT id FROM users WHERE email = 'manager1@zluri.com')),
('pod-b', 'Pod B', (SELECT id FROM users WHERE email = 'manager1@zluri.com')),
('pod-c', 'Pod C', (SELECT id FROM users WHERE email = 'manager2@zluri.com')),
('pod-d', 'Pod D', (SELECT id FROM users WHERE email = 'manager2@zluri.com')),
('pod-e', 'Pod E', (SELECT id FROM users WHERE email = 'manager3@zluri.com')),
('pod-f', 'Pod F', (SELECT id FROM users WHERE email = 'manager3@zluri.com'));

-- =========================
-- DB INSTANCES
-- Update these with your Neon credentials!
-- =========================

-- PostgreSQL instance (same Neon host, targets pg1/pg2 databases)
INSERT INTO db_instances (name, type, host, port, username, password) VALUES
('pg-instance', 'POSTGRES', 'ep-xxxxx.us-east-2.aws.neon.tech', 5432, 'YOUR_NEON_USER', 'YOUR_NEON_PASSWORD');

-- Example MongoDB instance (update with real MongoDB Atlas URI)
INSERT INTO db_instances (name, type, mongo_uri) VALUES
('md-instance', 'MONGODB', 'mongodb+srv://user:password@cluster.mongodb.net');
