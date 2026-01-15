import { Request, Response } from 'express';
import { DatabaseService } from './database.service';

export class DatabaseController {
  // GET /api/databases?instanceId=xxx
  static async listDatabases(req: Request, res: Response) {
    const { instanceId } = req.query;
    const databases = await DatabaseService.listDatabasesFromInstance(instanceId as string);
    res.json(databases.map(name => ({ database_name: name })));
  }
}
