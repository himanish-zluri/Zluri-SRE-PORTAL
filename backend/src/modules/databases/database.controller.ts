import { Request, Response } from 'express';
import { DatabaseService } from './database.service';

export class DatabaseController {
  // GET /api/databases?instanceId=xxx
  static async listDatabases(req: Request, res: Response) {
    const { instanceId } = req.query;

    if (!instanceId) {
      return res.status(400).json({ message: 'instanceId is required' });
    }

    try {
      const databases = await DatabaseService.listDatabasesFromInstance(instanceId as string);
      res.json(databases.map(name => ({ database_name: name })));
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to list databases', error: error.message });
    }
  }
}
