import { pool } from '../../config/db';

export class DatabaseRepository {
  static async findByInstanceId(instanceId: string) {
    const result = await pool.query(
      `
      SELECT database_name
      FROM db_instance_databases
      WHERE instance_id = $1
      ORDER BY database_name
      `,
      [instanceId]
    );

    return result.rows;
  }

  static async exists(instanceId: string, databaseName: string) {
    const result = await pool.query(
      `
      SELECT 1
      FROM db_instance_databases
      WHERE instance_id = $1 AND database_name = $2
      `,
      [instanceId, databaseName]
    );

    return (result.rowCount ?? 0) > 0;
  }
}
