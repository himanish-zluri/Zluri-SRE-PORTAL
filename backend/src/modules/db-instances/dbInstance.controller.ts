import { Request, Response } from 'express';
import { DbInstanceRepository } from './dbInstance.repository';

export class DbInstanceController {
  // GET /api/instances?type=POSTGRES
  static async listInstances(req: Request, res: Response) {
    const { type } = req.query;

    if (type) {
      const instances = await DbInstanceRepository.findByType(type as string);
      return res.json(instances);
    }

    const instances = await DbInstanceRepository.findAll();
    res.json(instances);
  }
}
