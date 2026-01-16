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

  static async findAll(): Promise<User[]> {
    const em = getEntityManager();
    return em.find(User, {}, { orderBy: { name: 'ASC' } });
  }

  static async updateSlackId(userId: string, slackId: string | null): Promise<void> {
    const em = getEntityManager();
    const user = await em.findOneOrFail(User, { id: userId });
    user.slackId = slackId || undefined;
    await em.flush();
  }
}
