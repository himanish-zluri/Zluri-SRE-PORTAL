import { pool } from '../../config/db';
import { decrypt } from '../../utils/crypto';

interface DbInstance {
  id: string;
  name: string;
  type: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  mongo_uri?: string;
  created_at: Date;
}

function decryptInstance(row: any): DbInstance | null {
  if (!row) return null;
  
  return {
    ...row,
    // Don't decrypt username - keep it as plain text
    password: row.password ? decrypt(row.password) : undefined,
    mongo_uri: row.mongo_uri ? decrypt(row.mongo_uri) : undefined,
  };
}

export class DbInstanceRepository {
  static async findById(instanceId: string) {
    const result = await pool.query(
      `SELECT *
       FROM db_instances
       WHERE id = $1`,
      [instanceId]
    );

    return decryptInstance(result.rows[0]);
  }

  static async findByType(type: string) {
    const result = await pool.query(
      `SELECT id, name, type
       FROM db_instances
       WHERE type = $1
       ORDER BY name`,
      [type]
    );

    return result.rows;
  }

  static async findAll() {
    const result = await pool.query(
      `SELECT id, name, type
       FROM db_instances
       ORDER BY name`
    );

    return result.rows;
  }
}
