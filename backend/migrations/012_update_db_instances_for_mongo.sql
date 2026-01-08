-- 1️⃣ Add database type
ALTER TABLE db_instances
ADD COLUMN type TEXT NOT NULL DEFAULT 'POSTGRES'
CHECK (type IN ('POSTGRES', 'MONGODB'));

-- 2️⃣ Add Mongo connection string
ALTER TABLE db_instances
ADD COLUMN mongo_uri TEXT;

-- 3️⃣ Make Postgres fields nullable (Mongo won’t use them)
ALTER TABLE db_instances
ALTER COLUMN host DROP NOT NULL,
ALTER COLUMN port DROP NOT NULL,
ALTER COLUMN username DROP NOT NULL,
ALTER COLUMN password DROP NOT NULL;
