/**
 * Script to encrypt existing db_instances credentials
 * Run with: npx ts-node scripts/encrypt-instances.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import { pool } from '../src/config/db';
import { encrypt, decrypt } from '../src/utils/crypto';

async function encryptExistingInstances() {
  console.log('Encrypting db_instances credentials...\n');

  // Get all instances
  const result = await pool.query('SELECT * FROM db_instances');
  
  for (const row of result.rows) {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Check if already encrypted (encrypted values contain colons)
    if (row.username && !row.username.includes(':')) {
      updates.push(`username = $${paramIndex++}`);
      values.push(encrypt(row.username));
      console.log(`Encrypting username for instance: ${row.name}`);
    }

    if (row.password && !row.password.includes(':')) {
      updates.push(`password = $${paramIndex++}`);
      values.push(encrypt(row.password));
      console.log(`Encrypting password for instance: ${row.name}`);
    }

    if (row.mongo_uri && !row.mongo_uri.includes(':encrypted:')) {
      // Special check for mongo_uri since it naturally contains colons
      try {
        decrypt(row.mongo_uri);
        // If decrypt succeeds, it's already encrypted
      } catch {
        updates.push(`mongo_uri = $${paramIndex++}`);
        values.push(encrypt(row.mongo_uri));
        console.log(`Encrypting mongo_uri for instance: ${row.name}`);
      }
    }

    if (updates.length > 0) {
      values.push(row.id);
      await pool.query(
        `UPDATE db_instances SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
        values
      );
    }
  }

  console.log('\nEncryption complete!');
  await pool.end();
}

encryptExistingInstances().catch(console.error);
