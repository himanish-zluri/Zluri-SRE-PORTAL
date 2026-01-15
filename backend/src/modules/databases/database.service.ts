import { Pool } from 'pg';
import { MongoClient } from 'mongodb';
import { DbInstanceRepository } from '../db-instances/dbInstance.repository';
import { NotFoundError, BadRequestError } from '../../errors';

export class DatabaseService {
  static async listDatabasesFromInstance(instanceId: string): Promise<string[]> {
    const instance = await DbInstanceRepository.findById(instanceId);
    
    if (!instance) {
      throw new NotFoundError('Instance not found');
    }

    if (instance.type === 'POSTGRES') {
      return this.listPostgresDatabases(instance);
    } else if (instance.type === 'MONGODB') {
      return this.listMongoDatabases(instance);
    } else {
      throw new BadRequestError(`Unsupported database type: ${instance.type}`);
    }
  }

  private static async listPostgresDatabases(instance: {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
  }): Promise<string[]> {
    if (!instance.host || !instance.port || !instance.username || !instance.password) {
      throw new BadRequestError('Postgres instance missing connection details');
    }

    const pool = new Pool({
      host: instance.host,
      port: instance.port,
      user: instance.username,
      password: instance.password,
      database: 'postgres', // Connect to default db to list all
    });

    try {
      const result = await pool.query(`
        SELECT datname 
        FROM pg_database 
        WHERE datistemplate = false 
          AND datname NOT IN ('postgres')
        ORDER BY datname
      `);
      
      return result.rows.map(row => row.datname);
    } finally {
      await pool.end();
    }
  }

  private static async listMongoDatabases(instance: {
    mongo_uri?: string;
  }): Promise<string[]> {
    if (!instance.mongo_uri) {
      throw new BadRequestError('MongoDB instance missing connection URI');
    }

    const client = new MongoClient(instance.mongo_uri);

    try {
      await client.connect();
      const adminDb = client.db().admin();
      const result = await adminDb.listDatabases();
      
      // Filter out system databases
      return result.databases
        .map(db => db.name)
        .filter(name => !['admin', 'config', 'local'].includes(name))
        .sort();
    } finally {
      await client.close();
    }
  }
}
