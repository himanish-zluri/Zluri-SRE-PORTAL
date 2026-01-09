import { Request, Response } from 'express';
import { PodsRepository } from './pods.repository';

export class PodsController {
  // GET /api/pods
  static async listPods(req: Request, res: Response) {
    const pods = await PodsRepository.findAll();
    res.json(pods);
  }

  // GET /api/pods/:id
  static async getPod(req: Request, res: Response) {
    const { id } = req.params;
    const pod = await PodsRepository.findById(id);

    if (!pod) {
      return res.status(404).json({ message: 'Pod not found' });
    }

    res.json(pod);
  }
}
