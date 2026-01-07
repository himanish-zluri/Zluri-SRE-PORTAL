import { Request, Response } from 'express';
import { DbInstanceDatabaseRepository } from './dbInstanceDatabase.repository';

export class DbInstanceController {
  static async listDatabases(req: Request, res: Response) {
    const { instanceId } = req.params;

    const databases =
      await DbInstanceDatabaseRepository.findByInstanceId(instanceId);

    res.json(databases);
  }
}
