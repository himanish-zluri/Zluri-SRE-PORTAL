CREATE TABLE db_instance_databases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES db_instances(id) ON DELETE CASCADE,
  database_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE (instance_id, database_name)
);