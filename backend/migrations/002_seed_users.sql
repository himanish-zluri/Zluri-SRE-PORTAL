-- =========================
-- MANAGERS
-- =========================
INSERT INTO users (id, email, name, password_hash, role)
VALUES
(
  gen_random_uuid(),
  'manager@zluri.com',
  'Zluri Manager',
  '$2b$10$OHq1FB7Pt8HLvFD7wUAiveBKX7i8dg491UOgB6TWAlLPraV7CXe2y',
  'MANAGER'
)
ON CONFLICT (email) DO NOTHING;;

-- =========================
-- DEVELOPERS
-- =========================
INSERT INTO users (id, email, name, password_hash, role)
VALUES
(
  gen_random_uuid(),
  'developer@zluri.com',
  'Zluri Developer',
  '$2b$10$OHq1FB7Pt8HLvFD7wUAiveBKX7i8dg491UOgB6TWAlLPraV7CXe2y',
  'DEVELOPER'
)
ON CONFLICT (email) DO NOTHING;;
