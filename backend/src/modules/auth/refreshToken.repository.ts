import crypto from 'crypto';
import { getEntityManager } from '../../config/database';
import { RefreshToken, User } from '../../entities';

export class RefreshTokenRepository {
  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static async create(userId: string, token: string, expiresAt: Date): Promise<RefreshToken> {
    const em = getEntityManager();
    const tokenHash = this.hashToken(token);
    
    const user = await em.findOneOrFail(User, { id: userId });
    
    const refreshToken = new RefreshToken();
    refreshToken.user = user;
    refreshToken.tokenHash = tokenHash;
    refreshToken.expiresAt = expiresAt;
    
    await em.persistAndFlush(refreshToken);
    return refreshToken;
  }

  static async findByToken(token: string): Promise<RefreshToken | null> {
    const em = getEntityManager();
    const tokenHash = this.hashToken(token);
    
    return em.findOne(
      RefreshToken,
      { 
        tokenHash,
        expiresAt: { $gt: new Date() }
      },
      { populate: ['user'] }
    );
  }

  static async deleteByToken(token: string): Promise<void> {
    const em = getEntityManager();
    const tokenHash = this.hashToken(token);
    
    await em.nativeDelete(RefreshToken, { tokenHash });
  }

  static async deleteAllForUser(userId: string): Promise<void> {
    const em = getEntityManager();
    await em.nativeDelete(RefreshToken, { user: userId });
  }

  static async deleteExpired(): Promise<void> {
    const em = getEntityManager();
    await em.nativeDelete(RefreshToken, { expiresAt: { $lt: new Date() } });
  }
}
