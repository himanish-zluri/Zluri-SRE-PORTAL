INSERT INTO users (email, name, password_hash, role)
VALUES
-- Managers
('manager1@zluri.com', 'Manager One',  '$2b$10$fJNl9n/GBYhujo8mG9ModOHYtrZ35C3uzaO08etJY5fnNEIRDk6p2', 'MANAGER'),
('manager2@zluri.com', 'Manager Two',  '$2b$10$fJNl9n/GBYhujo8mG9ModOHYtrZ35C3uzaO08etJY5fnNEIRDk6p2', 'MANAGER'),
('manager3@zluri.com', 'Manager Three','$2b$10$fJNl9n/GBYhujo8mG9ModOHYtrZ35C3uzaO08etJY5fnNEIRDk6p2', 'MANAGER'),

-- Developers
('dev1@zluri.com', 'Dev One',   '$2b$10$fJNl9n/GBYhujo8mG9ModOHYtrZ35C3uzaO08etJY5fnNEIRDk6p2', 'DEVELOPER'),
('dev2@zluri.com', 'Dev Two',   '$2b$10$fJNl9n/GBYhujo8mG9ModOHYtrZ35C3uzaO08etJY5fnNEIRDk6p2', 'DEVELOPER'),
('dev3@zluri.com', 'Dev Three', '$2b$10$fJNl9n/GBYhujo8mG9ModOHYtrZ35C3uzaO08etJY5fnNEIRDk6p2', 'DEVELOPER'),
('dev4@zluri.com', 'Dev Four',  '$2b$10$fJNl9n/GBYhujo8mG9ModOHYtrZ35C3uzaO08etJY5fnNEIRDk6p2', 'DEVELOPER'),
('dev5@zluri.com', 'Dev Five',  '$2b$10$fJNl9n/GBYhujo8mG9ModOHYtrZ35C3uzaO08etJY5fnNEIRDk6p2', 'DEVELOPER');
