import { pool } from '../../config/db';

export class PodsRepository {
  static async findAll() {
    const result = await pool.query(
      `SELECT p.id, p.name, p.manager_id, p.created_at, u.name as manager_name
       FROM pods p
       LEFT JOIN users u ON u.id = p.manager_id
       ORDER BY p.name`
    );

    return result.rows;
  }

  static async findById(id: string) {
    const result = await pool.query(
      `SELECT p.id, p.name, p.manager_id, p.created_at, u.name as manager_name
       FROM pods p
       LEFT JOIN users u ON u.id = p.manager_id
       WHERE p.id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }
}
