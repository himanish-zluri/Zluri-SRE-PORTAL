-- PostgreSQL instance
INSERT INTO db_instances (name, type, host, port, username, password)
VALUES ('pg-instance', 'POSTGRES', 'localhost', 5432, 'himanish', 'zluri');

-- MongoDB instance
INSERT INTO db_instances (name, type, mongo_uri)
VALUES ('md-instance', 'MONGODB', 'mongodb://localhost:27017');
