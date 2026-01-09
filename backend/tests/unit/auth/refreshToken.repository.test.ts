import { RefreshTokenRepository } from '../../../src/modules/auth/refreshToken.repository';
import { pool } from '../../../src/config/db';

jest.mock('../../../src/config/db', () => ({
  pool: {
    query: jest.fn()
  }
}));

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
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const expiresAt = new Date('2025-01-16');
      await RefreshTokenRepository.create('user-1', 'refresh-token', expiresAt);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO refresh_tokens'),
        ['user-1', expect.any(String), expiresAt]
      );
    });
  });

  describe('findByToken', () => {
    it('should return token record if valid', async () => {
      const mockRecord = { id: 'token-1', user_id: 'user-1' };
      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockRecord] });

      const result = await RefreshTokenRepository.findByToken('valid-token');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE token_hash = $1 AND expires_at > NOW()'),
        [expect.any(String)]
      );
      expect(result).toEqual(mockRecord);
    });

    it('should return null if token not found or expired', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await RefreshTokenRepository.findByToken('invalid-token');

      expect(result).toBeNull();
    });
  });

  describe('deleteByToken', () => {
    it('should delete a specific token', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await RefreshTokenRepository.deleteByToken('token-to-delete');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM refresh_tokens WHERE token_hash = $1'),
        [expect.any(String)]
      );
    });
  });

  describe('deleteAllForUser', () => {
    it('should delete all tokens for a user', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await RefreshTokenRepository.deleteAllForUser('user-1');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM refresh_tokens WHERE user_id = $1'),
        ['user-1']
      );
    });
  });

  describe('deleteExpired', () => {
    it('should delete expired tokens', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await RefreshTokenRepository.deleteExpired();

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM refresh_tokens WHERE expires_at < NOW()')
      );
    });
  });
});
