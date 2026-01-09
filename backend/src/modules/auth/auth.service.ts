import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserRepository } from '../users/user.repository';
import { RefreshTokenRepository } from './refreshToken.repository';

const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_DAYS = 7;

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }
  return secret;
};

export class AuthService {
  static generateAccessToken(userId: string, role: string): string {
    return jwt.sign(
      { userId, role },
      getJwtSecret(),
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
    );
  }

  static generateRefreshToken(): string {
    return crypto.randomBytes(40).toString('hex');
  }

  static async login(email: string, password: string) {
    const user = await UserRepository.findByEmail(email);

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      throw new Error('Invalid credentials');
    }

    const accessToken = this.generateAccessToken(user.id, user.role);
    const refreshToken = this.generateRefreshToken();
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);
    
    await RefreshTokenRepository.create(user.id, refreshToken, expiresAt);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    };
  }

  static async refresh(refreshToken: string) {
    const tokenRecord = await RefreshTokenRepository.findByToken(refreshToken);
    
    if (!tokenRecord) {
      throw new Error('Invalid or expired refresh token');
    }

    const user = await UserRepository.findById(tokenRecord.user_id);
    
    if (!user) {
      throw new Error('User not found');
    }

    // Generate new access token
    const accessToken = this.generateAccessToken(user.id, user.role);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    };
  }

  static async logout(refreshToken: string) {
    await RefreshTokenRepository.deleteByToken(refreshToken);
  }

  static async logoutAll(userId: string) {
    await RefreshTokenRepository.deleteAllForUser(userId);
  }
}
