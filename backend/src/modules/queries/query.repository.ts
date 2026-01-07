import { pool } from '../../config/db';

export class QueryRepository {
  static async create(data: {
    requesterId: string;
    instanceId: string;
    databaseName: string;
    queryText: string;
    podId: string;
    comments: string;
    submissionType: 'QUERY';
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
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
      RETURNING *
      `,
      [
        data.requesterId,
        data.instanceId,
        data.databaseName,
        data.queryText,
        data.podId,
        data.comments,
        data.submissionType
      ]
    );

    return result.rows[0];
  }
}
