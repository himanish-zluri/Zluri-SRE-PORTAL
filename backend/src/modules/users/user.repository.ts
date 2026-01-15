import { getEntityManager } from '../../config/database';
import { User } from '../../entities';

export class UserRepository {
  static async findByEmail(email: string): Promise<User | null> {
    const em = getEntityManager();
    return em.findOne(User, { email });
  }

  static async findById(id: string): Promise<User | null> {
    const em = getEntityManager();
    return em.findOne(User, { id });
  }
}
