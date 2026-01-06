-- =========================
-- MANAGERS
-- =========================
INSERT INTO users (id, email, name, password_hash, role)
VALUES
(
  gen_random_uuid(),
  'manager@zluri.com',
  'Zluri Manager',
  '$2b$10$dummyhash',
  'MANAGER'
);

-- =========================
-- DEVELOPERS
-- =========================
INSERT INTO users (id, email, name, password_hash, role)
VALUES
(
  gen_random_uuid(),
  'developer@zluri.com',
  'Zluri Developer',
  '$2b$10$dummyhash',
  'DEVELOPER'
);
