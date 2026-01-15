import { Request, Response } from 'express';
import { PodsRepository } from './pods.repository';
import { NotFoundError } from '../../errors';
import { Pod } from '../../entities';

// Serialize pod for API response
function serializePod(pod: Pod) {
  return {
    id: pod.id,
    name: pod.name,
    manager_id: pod.manager?.id,
    manager_name: pod.manager?.name,
    created_at: pod.createdAt,
  };
}

export class PodsController {
  // GET /api/pods
  static async listPods(_req: Request, res: Response) {
    const pods = await PodsRepository.findAll();
    res.json(pods.map(serializePod));
  }

  // GET /api/pods/:id
  static async getPod(req: Request, res: Response) {
    const { id } = req.params;
    const pod = await PodsRepository.findById(id);

    if (!pod) {
      throw new NotFoundError('Pod not found');
    }

    res.json(serializePod(pod));
  }
}
