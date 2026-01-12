import { pool } from '../../config/db';

export type AuditAction = 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'FAILED';

export class AuditRepository {
  static async log(data: {
    queryRequestId: string;
    action: AuditAction;
    performedBy: string;
    details?: Record<string, any>;
  }) {
    const result = await pool.query(
      `INSERT INTO query_audit_log (query_request_id, action, performed_by, details)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.queryRequestId, data.action, data.performedBy, JSON.stringify(data.details || {})]
    );
    return result.rows[0];
  }

  static async findByQueryId(queryRequestId: string) {
    const result = await pool.query(
      `SELECT qal.*, u.name as performed_by_name, u.email as performed_by_email
       FROM query_audit_log qal
       JOIN users u ON u.id = qal.performed_by
       WHERE qal.query_request_id = $1
       ORDER BY qal.created_at ASC`,
      [queryRequestId]
    );
    return result.rows;
  }

  static async findByUserId(userId: string, limit = 100, offset = 0) {
    const result = await pool.query(
      `SELECT qal.*, u.name as performed_by_name, u.email as performed_by_email
       FROM query_audit_log qal
       JOIN users u ON u.id = qal.performed_by
       WHERE qal.performed_by = $1
       ORDER BY qal.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  }

  static async findAll(limit = 100, offset = 0) {
    const result = await pool.query(
      `SELECT qal.*, u.name as performed_by_name, u.email as performed_by_email
       FROM query_audit_log qal
       JOIN users u ON u.id = qal.performed_by
       ORDER BY qal.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  static async findByDatabaseName(databaseName: string, limit = 100, offset = 0) {
    const result = await pool.query(
      `SELECT qal.*, u.name as performed_by_name, u.email as performed_by_email,
              qr.database_name, qr.instance_id
       FROM query_audit_log qal
       JOIN users u ON u.id = qal.performed_by
       JOIN query_requests qr ON qr.id = qal.query_request_id
       WHERE qr.database_name = $1
       ORDER BY qal.created_at DESC
       LIMIT $2 OFFSET $3`,
      [databaseName, limit, offset]
    );
    return result.rows;
  }
}
