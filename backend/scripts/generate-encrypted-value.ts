/**
 * Helper script to generate encrypted values for new instances
 * Run with: npx ts-node scripts/generate-encrypted-value.ts "your-secret-value"
 */
import dotenv from 'dotenv';
dotenv.config();

import { encrypt } from '../src/utils/crypto';

const value = process.argv[2];

if (!value) {
  console.log('Usage: npx ts-node scripts/generate-encrypted-value.ts "your-secret-value"');
  process.exit(1);
}

console.log('Encrypted value:');
console.log(encrypt(value));
