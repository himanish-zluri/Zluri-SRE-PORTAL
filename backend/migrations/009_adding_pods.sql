INSERT INTO pods (id, name, manager_id)
VALUES
(
  'pod-a',
  'Pod A',
  (SELECT id FROM users WHERE email = 'manager1@zluri.com')
),
(
  'pod-b',
  'Pod B',
  (SELECT id FROM users WHERE email = 'manager1@zluri.com')
),
(
  'pod-c',
  'Pod C',
  (SELECT id FROM users WHERE email = 'manager2@zluri.com')
),
(
  'pod-d',
  'Pod D',
  (SELECT id FROM users WHERE email = 'manager2@zluri.com')
),
(
  'pod-e',
  'Pod E',
  (SELECT id FROM users WHERE email = 'manager3@zluri.com')
),
(
  'pod-f',
  'Pod F',
  (SELECT id FROM users WHERE email = 'manager3@zluri.com')
);
