import { pool } from '../../config/db';

export interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: 'DEVELOPER' | 'MANAGER' | 'ADMIN';
}

export class UserRepository {
  static async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query(
      `SELECT id, email, name, password_hash, role
       FROM users
       WHERE email = $1`,
      [email]
    );

    return result.rows[0] || null;
  }

  static async findById(id: string): Promise<User | null> {
    const result = await pool.query(
      `SELECT id, email, name, password_hash, role
       FROM users
       WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }
}
