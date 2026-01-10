import { pool } from '../../config/db';

export class QueryRepository {
  static async findById(id: string) {
    const result = await pool.query(
      `SELECT * FROM query_requests WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async isManagerOfPod(managerId: string, podId: string) {
    const result = await pool.query(
      `SELECT 1 FROM pods WHERE id = $1 AND manager_id = $2`,
      [podId, managerId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  static async reject(queryId: string, managerId: string, reason?: string) {
    const result = await pool.query(
      `UPDATE query_requests
       SET status = 'REJECTED',
           approved_by = $1,
           rejection_reason = $2,
           updated_at = now()
       WHERE id = $3
       RETURNING *`,
      [managerId, reason || null, queryId]
    );
    return result.rows[0];
  }

  static async create(data: {
    requesterId: string;
    instanceId: string;
    databaseName: string;
    queryText: string;
    podId: string;
    comments: string;
    submissionType: 'QUERY' | 'SCRIPT';
    scriptPath?: string;
  }) {
    const result = await pool.query(
      `
      INSERT INTO query_requests (
        requester_id,
        instance_id,
        database_name,
        query_text,
        pod_id,
        comments,
        submission_type,
        script_path,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING')
      RETURNING *
      `,
      [
        data.requesterId,
        data.instanceId,
        data.databaseName,
        data.queryText || '[SCRIPT SUBMISSION]',
        data.podId,
        data.comments,
        data.submissionType,
        data.scriptPath || null
      ]
    );
    return result.rows[0];
  }

  static async findByRequesterWithStatus(userId: string, statusFilter?: string[], typeFilter?: string) {
    let query = `
      SELECT qr.* 
      FROM query_requests qr
      JOIN db_instances di ON di.id = qr.instance_id
      WHERE qr.requester_id = $1
    `;
    const params: any[] = [userId];
    let paramIndex = 2;

    if (statusFilter && statusFilter.length > 0) {
      query += ` AND qr.status = ANY($${paramIndex})`;
      params.push(statusFilter);
      paramIndex++;
    }

    if (typeFilter) {
      query += ` AND di.type = $${paramIndex}`;
      params.push(typeFilter);
    }

    query += ` ORDER BY qr.created_at DESC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async findByManagerWithStatus(managerId: string, statusFilter?: string[], typeFilter?: string) {
    let query = `
      SELECT qr.*
      FROM query_requests qr
      JOIN pods p ON p.id = qr.pod_id
      JOIN db_instances di ON di.id = qr.instance_id
      WHERE p.manager_id = $1
    `;
    const params: any[] = [managerId];
    let paramIndex = 2;

    if (statusFilter && statusFilter.length > 0) {
      query += ` AND qr.status = ANY($${paramIndex})`;
      params.push(statusFilter);
      paramIndex++;
    }

    if (typeFilter) {
      query += ` AND di.type = $${paramIndex}`;
      params.push(typeFilter);
    }

    query += ` ORDER BY qr.created_at DESC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async findAllWithStatus(statusFilter?: string[], typeFilter?: string) {
    let query = `
      SELECT qr.* 
      FROM query_requests qr
      JOIN db_instances di ON di.id = qr.instance_id
    `;
    const params: any[] = [];
    let paramIndex = 1;
    const conditions: string[] = [];

    if (statusFilter && statusFilter.length > 0) {
      conditions.push(`qr.status = ANY($${paramIndex})`);
      params.push(statusFilter);
      paramIndex++;
    }

    if (typeFilter) {
      conditions.push(`di.type = $${paramIndex}`);
      params.push(typeFilter);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY qr.created_at DESC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async markExecuted(queryId: string, managerId: string, result: any) {
    await pool.query(
      `
      UPDATE query_requests
      SET status = 'EXECUTED',
          approved_by = $2,
          execution_result = $3,
          updated_at = now()
      WHERE id = $1
      `,
      [queryId, managerId, JSON.stringify(result)]
    );
  }

  static async markFailed(queryId: string, managerId: string, error: string) {
    await pool.query(
      `
      UPDATE query_requests
      SET status = 'FAILED',
          approved_by = $2,
          execution_result = $3,
          updated_at = now()
      WHERE id = $1
      `,
      [queryId, managerId, JSON.stringify({ error })]
    );
  }
}
