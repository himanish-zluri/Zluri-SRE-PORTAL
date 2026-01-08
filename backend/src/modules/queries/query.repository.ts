import { pool } from '../../config/db';

export class QueryRepository {

    static async findById(id: string) {
        const result = await pool.query(
          `SELECT * FROM query_requests WHERE id = $1`,
          [id]
        );
      
        return result.rows[0] || null;
      }      

    static findPendingByManager(managerId: string) {
        return pool.query(`
          SELECT qr.*
          FROM query_requests qr
          JOIN pods p ON p.id = qr.pod_id
          WHERE p.manager_id = $1
            AND qr.status = 'PENDING'
          ORDER BY qr.created_at DESC
        `, [managerId]).then(r => r.rows);
      }
      
      static isManagerOfPod(managerId: string, podId: string) {
        return pool.query(
          `SELECT 1 FROM pods WHERE id = $1 AND manager_id = $2`,
          [podId, managerId]
        ).then(r => (r.rowCount ?? 0) > 0);
      }
      
      static updateStatus(queryId: string, status: string, managerId: string) {
        return pool.query(
          `UPDATE query_requests
           SET status = $1, approved_by = $2, updated_at = now()
           WHERE id = $3
           RETURNING *`,
          [status, managerId, queryId]
        ).then(r => r.rows[0]);
      }
      
      static reject(queryId: string, managerId: string, reason?: string) {
        return pool.query(
          `UPDATE query_requests
           SET status = 'REJECTED',
               approved_by = $1,
               rejection_reason = $2,
               updated_at = now()
           WHERE id = $3
           RETURNING *`,
          [managerId, reason || null, queryId]
        ).then(r => r.rows[0]);
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
    console.log('📝 QueryRepository.create called with:', data);
    try {
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
          data.queryText,
          data.podId,
          data.comments,
          data.submissionType,
          data.scriptPath || null
        ]
      );

      console.log('✅ Query created:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Database error in create:', error);
      throw error;
    }
  }

  static async findByRequester(userId: string) {
    const result = await pool.query(
      `SELECT *
       FROM query_requests
       WHERE requester_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
  
    return result.rows;
  }

  static async markExecuted(
    queryId: string,
    managerId: string,
    result: any
  ) {
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
  
  static async markFailed(
    queryId: string,
    managerId: string,
    error: string
  ) {
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
