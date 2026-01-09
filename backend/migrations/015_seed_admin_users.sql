-- =========================
-- ADMIN USERS
-- Manages database instances, POD configurations
-- =========================
INSERT INTO users (id, email, name, password_hash, role)
VALUES
(
  gen_random_uuid(),
  'admin1@zluri.com',
  'Admin One',
  '$2b$10$OHq1FB7Pt8HLvFD7wUAiveBKX7i8dg491UOgB6TWAlLPraV7CXe2y',
  'ADMIN'
),
(
  gen_random_uuid(),
  'admin2@zluri.com',
  'Admin Two',
  '$2b$10$OHq1FB7Pt8HLvFD7wUAiveBKX7i8dg491UOgB6TWAlLPraV7CXe2y',
  'ADMIN'
)
ON CONFLICT (email) DO NOTHING;
