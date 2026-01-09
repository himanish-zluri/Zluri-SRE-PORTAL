import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables from .env.test
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
