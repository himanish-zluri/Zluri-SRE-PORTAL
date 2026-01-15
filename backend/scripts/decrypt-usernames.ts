/**
 * Script to decrypt existing usernames in db_instances table
 * Run with: npx ts-node scripts/decrypt-usernames.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import { pool } from '../src/config/db';
import { decrypt } from '../src/utils/crypto';

async function decryptUsernames() {
  console.log('Decrypting usernames in db_instances table...\n');

  // Get all instances
  const result = await pool.query('SELECT id, name, username FROM db_instances');
  
  for (const row of result.rows) {
    if (row.username && row.username.includes(':')) {
      try {
        // Try to decrypt the username
        const decryptedUsername = decrypt(row.username);
        
        // Update with decrypted username
        await pool.query(
          'UPDATE db_instances SET username = $1 WHERE id = $2',
          [decryptedUsername, row.id]
        );
        
        console.log(`Decrypted username for instance: ${row.name} (${decryptedUsername})`);
      } catch (error) {
        console.log(`Username for instance ${row.name} is not encrypted or invalid format`);
      }
    } else {
      console.log(`Username for instance ${row.name} is already plain text`);
    }
  }

  console.log('\nUsername decryption complete!');
  await pool.end();
}

decryptUsernames().catch(console.error);