import { RefreshTokenRepository } from '../../../src/modules/auth/refreshToken.repository';
import { mockEntityManager } from '../../__mocks__/database';

describe('RefreshTokenRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hashToken', () => {
    it('should hash a token consistently', () => {
      const token = 'my-refresh-token';
      const hash1 = RefreshTokenRepository.hashToken(token);
      const hash2 = RefreshTokenRepository.hashToken(token);

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(token);
      expect(hash1.length).toBe(64); // SHA-256 produces 64 hex chars
    });

    it('should produce different hashes for different tokens', () => {
      const hash1 = RefreshTokenRepository.hashToken('token1');
      const hash2 = RefreshTokenRepository.hashToken('token2');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('create', () => {
    it('should insert a new refresh token', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      mockEntityManager.findOneOrFail.mockResolvedValue(mockUser);
      mockEntityManager.persistAndFlush.mockResolvedValue(undefined);

      const expiresAt = new Date('2025-01-16');
      await RefreshTokenRepository.create('user-1', 'refresh-token', expiresAt);

      expect(mockEntityManager.findOneOrFail).toHaveBeenCalledWith(
        expect.any(Function),
        { id: 'user-1' }
      );
      expect(mockEntityManager.persistAndFlush).toHaveBeenCalled();
    });
  });

  describe('findByToken', () => {
    it('should return token record if valid', async () => {
      const mockRecord = { id: 'token-1', user: { id: 'user-1' } };
      mockEntityManager.findOne.mockResolvedValue(mockRecord);

      const result = await RefreshTokenRepository.findByToken('valid-token');

      expect(mockEntityManager.findOne).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          tokenHash: expect.any(String),
          expiresAt: expect.any(Object)
        }),
        expect.objectContaining({ populate: ['user'] })
      );
      expect(result).toEqual(mockRecord);
    });

    it('should return null if token not found or expired', async () => {
      mockEntityManager.findOne.mockResolvedValue(null);

      const result = await RefreshTokenRepository.findByToken('invalid-token');

      expect(result).toBeNull();
    });
  });

  describe('deleteByToken', () => {
    it('should delete a specific token', async () => {
      mockEntityManager.nativeDelete.mockResolvedValue(1);

      await RefreshTokenRepository.deleteByToken('token-to-delete');

      expect(mockEntityManager.nativeDelete).toHaveBeenCalledWith(
        expect.any(Function),
        { tokenHash: expect.any(String) }
      );
    });
  });

  describe('deleteAllForUser', () => {
    it('should delete all tokens for a user', async () => {
      mockEntityManager.nativeDelete.mockResolvedValue(3);

      await RefreshTokenRepository.deleteAllForUser('user-1');

      expect(mockEntityManager.nativeDelete).toHaveBeenCalledWith(
        expect.any(Function),
        { user: 'user-1' }
      );
    });
  });

  describe('deleteExpired', () => {
    it('should delete expired tokens', async () => {
      mockEntityManager.nativeDelete.mockResolvedValue(5);

      await RefreshTokenRepository.deleteExpired();

      expect(mockEntityManager.nativeDelete).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          expiresAt: expect.any(Object)
        })
      );
    });
  });
});
