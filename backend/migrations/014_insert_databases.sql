-- Link databases to instances
INSERT INTO db_instance_databases (instance_id, database_name)
VALUES 
  ((SELECT id FROM db_instances WHERE name = 'pg-instance'), 'pg1'),
  ((SELECT id FROM db_instances WHERE name = 'pg-instance'), 'pg2'),
  ((SELECT id FROM db_instances WHERE name = 'md-instance'), 'md1'),
  ((SELECT id FROM db_instances WHERE name = 'md-instance'), 'md2');
