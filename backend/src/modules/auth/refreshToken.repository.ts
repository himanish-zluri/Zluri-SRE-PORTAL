import crypto from 'crypto';
import { pool } from '../../config/db';

export class RefreshTokenRepository {
  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static async create(userId: string, token: string, expiresAt: Date) {
    const tokenHash = this.hashToken(token);
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt]
    );
  }

  static async findByToken(token: string) {
    const tokenHash = this.hashToken(token);
    const result = await pool.query(
      `SELECT * FROM refresh_tokens 
       WHERE token_hash = $1 AND expires_at > NOW()`,
      [tokenHash]
    );
    return result.rows[0] || null;
  }

  static async deleteByToken(token: string) {
    const tokenHash = this.hashToken(token);
    await pool.query(
      `DELETE FROM refresh_tokens WHERE token_hash = $1`,
      [tokenHash]
    );
  }

  static async deleteAllForUser(userId: string) {
    await pool.query(
      `DELETE FROM refresh_tokens WHERE user_id = $1`,
      [userId]
    );
  }

  static async deleteExpired() {
    await pool.query(`DELETE FROM refresh_tokens WHERE expires_at < NOW()`);
  }
}
