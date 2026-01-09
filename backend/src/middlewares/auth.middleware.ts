import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../modules/users/user.repository';

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
    res: Response,
    next: NextFunction
  ) => {
    try {
      const authHeader = req.headers.authorization;
  
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
  
      const token = authHeader.split(' ')[1];
  
      const payload = jwt.verify(token, getJwtSecret()) as {
        userId: string;
        role: string;
      };
  
      const user = await UserRepository.findById(payload.userId);
  
      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
  
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role
      };
  
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  };
  
  export const requireRole = (allowedRoles: Array<'DEVELOPER' | 'MANAGER' | 'ADMIN'>) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
  
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
  
      next();
    };
  };
  

// export const requireManager = (
//     req: AuthenticatedRequest,
//     res: Response,
//     next: NextFunction
//   ) => {
//     if (!req.user) {
//       return res.status(401).json({ message: 'Unauthorized' });
//     }
  
//     if (req.user.role !== 'MANAGER') {
//       return res.status(403).json({ message: 'Forbidden' });
//     }
  
//     next();
//   };

// export const requireManager = (
//   req: AuthenticatedRequest,
//   res: Response,
//   next: NextFunction
// ) => {
//   if (!req.user) {
//     return res.status(401).json({ message: 'Unauthorized' });
//   }

//   if (req.user.role !== 'MANAGER') {
//     return res.status(403).json({ message: 'Forbidden' });
//   }

//   next();
// };

// export const requireAdmin = (
//   req: AuthenticatedRequest,
//   res: Response,
//   next: NextFunction
// ) => {
//   if (!req.user) {
//     return res.status(401).json({ message: 'Unauthorized' });
//   }

//   if (req.user.role !== 'ADMIN') {
//     return res.status(403).json({ message: 'Forbidden: Admin access required' });
//   }

//   next();
// };

// export const requireManagerOrAdmin = (
//   req: AuthenticatedRequest,
//   res: Response,
//   next: NextFunction
// ) => {
//   if (!req.user) {
//     return res.status(401).json({ message: 'Unauthorized' });
//   }

//   if (req.user.role !== 'MANAGER' && req.user.role !== 'ADMIN') {
//     return res.status(403).json({ message: 'Forbidden: Manager or Admin access required' });
//   }

//   next();
// };
  