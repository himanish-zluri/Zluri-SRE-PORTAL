import { Request, Response } from 'express';
import { PodsRepository } from './pods.repository';
import { NotFoundError } from '../../errors';

export class PodsController {
  // GET /api/pods
  static async listPods(_req: Request, res: Response) {
    const pods = await PodsRepository.findAll();
    res.json(pods);
  }

  // GET /api/pods/:id
  static async getPod(req: Request, res: Response) {
    const { id } = req.params;
    const pod = await PodsRepository.findById(id);

    if (!pod) {
      throw new NotFoundError('Pod not found');
    }

    res.json(pod);
  }
}
