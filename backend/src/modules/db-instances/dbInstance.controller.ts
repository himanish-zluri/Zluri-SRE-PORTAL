import { Request, Response } from 'express';
import { DbInstanceDatabaseRepository } from './dbInstanceDatabase.repository';
import { DbInstanceRepository } from './dbInstance.repository';

export class DbInstanceController {
  // GET /api/instance?type=POSTGRES
  static async listInstances(req: Request, res: Response) {
    const { type } = req.query;

    if (type) {
      const instances = await DbInstanceRepository.findByType(type as string);
      return res.json(instances);
    }

    const instances = await DbInstanceRepository.findAll();
    res.json(instances);
  }

  // GET /api/database?instanceId=xxx
  static async listDatabases(req: Request, res: Response) {
    const { instanceId } = req.query;

    if (!instanceId) {
      return res.status(400).json({ message: 'instanceId is required' });
    }

    const databases = await DbInstanceDatabaseRepository.findByInstanceId(instanceId as string);
    res.json(databases);
  }
}
