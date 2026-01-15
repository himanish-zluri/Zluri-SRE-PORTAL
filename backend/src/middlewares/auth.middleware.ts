import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../modules/users/user.repository';
import { UnauthorizedError, ForbiddenError } from '../errors';

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }
  return secret;
};

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'DEVELOPER' | 'MANAGER' | 'ADMIN';
  };
}

export const requireAuth = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.split(' ')[1];

    const payload = jwt.verify(token, getJwtSecret()) as {
      userId: string;
      role: string;
    };

    const user = await UserRepository.findById(payload.userId);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
    } else {
      next(new UnauthorizedError('Invalid or expired token'));
    }
  }
};

export const requireRole = (allowedRoles: Array<'DEVELOPER' | 'MANAGER' | 'ADMIN'>) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError(`Access denied. Required roles: ${allowedRoles.join(', ')}`));
    }

    next();
  };
};