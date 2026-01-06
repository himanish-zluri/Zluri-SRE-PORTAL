-- =========================
-- PODS
-- =========================
-- All PODs are managed by the same manager for demo purposes

INSERT INTO pods (id, name, manager_id)
SELECT 'pod-1', 'Pod 1', id FROM users WHERE email = 'manager@zluri.com';

INSERT INTO pods (id, name, manager_id)
SELECT 'de', 'DE', id FROM users WHERE email = 'manager@zluri.com';

INSERT INTO pods (id, name, manager_id)
SELECT 'db', 'DB', id FROM users WHERE email = 'manager@zluri.com';
