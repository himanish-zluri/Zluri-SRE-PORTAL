import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../modules/users/user.repository';

// const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
// const JWT_SECRET = process.env.JWT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined');
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'DEVELOPER' | 'MANAGER' | 'ADMIN';
  };
}

export const requireAuth = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    console.log('AUTH HEADER:', req.headers.authorization);
  
    try {
      const authHeader = req.headers.authorization;
  
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('❌ No auth header or does not start with Bearer');
        return res.status(401).json({ message: 'Unauthorized' });
      }
  
      const token = authHeader.split(' ')[1];
      console.log('🔑 Token extracted:', token.substring(0, 20) + '...');
  
      const payload = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        role: string;
      };
      console.log('✅ Token verified, userId:', payload.userId);
  
      const user = await UserRepository.findById(payload.userId);
      console.log('👤 User found:', user ? user.email : 'NULL');
  
      if (!user) {
        console.log('❌ User not found in database');
        return res.status(401).json({ message: 'Unauthorized' });
      }
  
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role
      };
  
      console.log('✅ Auth successful for:', user.email);
      next();
    } catch (error) {
      console.log('❌ Auth error:', error);
      return res.status(401).json({ message: 'Unauthorized' });
    }
  };


export const requireManager = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  
    if (req.user.role !== 'MANAGER') {
      return res.status(403).json({ message: 'Forbidden' });
    }
  
    next();
  };
  