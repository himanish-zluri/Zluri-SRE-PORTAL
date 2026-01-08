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
}
