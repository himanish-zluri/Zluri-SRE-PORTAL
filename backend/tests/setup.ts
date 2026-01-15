import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables from .env.test
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

// Mock uuid module (ESM module that Jest can't handle directly)
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-' + Math.random().toString(36).substr(2, 9))
}));

// Mock MikroORM database module globally
jest.mock('../src/config/database', () => require('./__mocks__/database'));
