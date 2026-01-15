import { AuthService } from '../../../src/modules/auth/auth.service';
import { UserRepository } from '../../../src/modules/users/user.repository';
import { RefreshTokenRepository } from '../../../src/modules/auth/refreshToken.repository';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../../../src/modules/users/user.repository');
jest.mock('../../../src/modules/auth/refreshToken.repository');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, JWT_SECRET: 'test-secret' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // Mock user entity with camelCase properties
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'DEVELOPER',
    passwordHash: 'hashed_password'
  };

  describe('login', () => {
    it('should return accessToken, refreshToken and user on successful login', async () => {
      (UserRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('mock-access-token');
      (RefreshTokenRepository.create as jest.Mock).mockResolvedValue(undefined);

      const result = await AuthService.login('test@example.com', 'password123');

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role
      });
      expect(UserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed_password');
      expect(RefreshTokenRepository.create).toHaveBeenCalled();
    });

    it('should throw error when user not found', async () => {
      (UserRepository.findByEmail as jest.Mock).mockResolvedValue(null);

      await expect(AuthService.login('unknown@example.com', 'password'))
        .rejects.toThrow('Invalid email or password');
    });

    it('should throw error when password is incorrect', async () => {
      (UserRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(AuthService.login('test@example.com', 'wrongpassword'))
        .rejects.toThrow('Invalid email or password');
    });
  });

  describe('refresh', () => {
    it('should return new accessToken on valid refresh token', async () => {
      // Token record with populated user relation
      const tokenRecord = { user: mockUser };
      (RefreshTokenRepository.findByToken as jest.Mock).mockResolvedValue(tokenRecord);
      (jwt.sign as jest.Mock).mockReturnValue('new-access-token');

      const result = await AuthService.refresh('valid-refresh-token');

      expect(result.accessToken).toBe('new-access-token');
      expect(result.user.id).toBe(mockUser.id);
    });

    it('should throw error on invalid refresh token', async () => {
      (RefreshTokenRepository.findByToken as jest.Mock).mockResolvedValue(null);

      await expect(AuthService.refresh('invalid-token'))
        .rejects.toThrow('Invalid or expired refresh token');
    });

    it('should throw error when user not found', async () => {
      // Token record with null user (not populated or deleted)
      (RefreshTokenRepository.findByToken as jest.Mock).mockResolvedValue({ user: null });

      await expect(AuthService.refresh('valid-token'))
        .rejects.toThrow('User not found');
    });
  });

  describe('logout', () => {
    it('should delete refresh token', async () => {
      (RefreshTokenRepository.deleteByToken as jest.Mock).mockResolvedValue(undefined);

      await AuthService.logout('refresh-token');

      expect(RefreshTokenRepository.deleteByToken).toHaveBeenCalledWith('refresh-token');
    });
  });

  describe('logoutAll', () => {
    it('should delete all refresh tokens for user', async () => {
      (RefreshTokenRepository.deleteAllForUser as jest.Mock).mockResolvedValue(undefined);

      await AuthService.logoutAll('user-123');

      expect(RefreshTokenRepository.deleteAllForUser).toHaveBeenCalledWith('user-123');
    });
  });

  describe('generateAccessToken', () => {
    it('should generate a JWT token', () => {
      (jwt.sign as jest.Mock).mockReturnValue('generated-token');

      const token = AuthService.generateAccessToken('user-123', 'DEVELOPER');

      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: 'user-123', role: 'DEVELOPER' },
        expect.any(String),
        { expiresIn: '15m' }
      );
      expect(token).toBe('generated-token');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a random hex string', () => {
      const token = AuthService.generateRefreshToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(80); // 40 bytes = 80 hex chars
    });
  });

  describe('getJwtSecret', () => {
    it('should throw error when JWT_SECRET is not defined', () => {
      delete process.env.JWT_SECRET;

      expect(() => AuthService.generateAccessToken('user-123', 'DEVELOPER'))
        .toThrow('JWT_SECRET is not defined');
    });
  });
});
