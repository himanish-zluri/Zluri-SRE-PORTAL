import { pool } from '../../config/db';

export class DbInstanceRepository {
  static async findById(instanceId: string) {
    const result = await pool.query(
      `SELECT *
       FROM db_instances
       WHERE id = $1`,
      [instanceId]
    );

    return result.rows[0] || null;
  }

  static async findByType(type: string) {
    const result = await pool.query(
      `SELECT id, name, host, port, type, created_at
       FROM db_instances
       WHERE type = $1
       ORDER BY name`,
      [type]
    );

    return result.rows;
  }

  static async findAll() {
    const result = await pool.query(
      `SELECT id, name, host, port, type, created_at
       FROM db_instances
       ORDER BY name`
    );

    return result.rows;
  }
}
