import { getEntityManager } from '../../config/database';
import { Pod } from '../../entities';

export class PodsRepository {
  static async findAll(): Promise<Pod[]> {
    const em = getEntityManager();
    return em.find(Pod, {}, { 
      populate: ['manager'],
      orderBy: { name: 'ASC' }
    });
  }

  static async findById(id: string): Promise<Pod | null> {
    const em = getEntityManager();
    return em.findOne(Pod, { id }, { populate: ['manager'] });
  }
}
