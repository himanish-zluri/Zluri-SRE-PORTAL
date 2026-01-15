import { Response, NextFunction } from 'express';
import { requireAuth, requireRole, AuthenticatedRequest } from '../../../src/middlewares/auth.middleware';
import { UserRepository } from '../../../src/modules/users/user.repository';
import { UnauthorizedError, ForbiddenError } from '../../../src/errors';
import jwt from 'jsonwebtoken';

jest.mock('../../../src/modules/users/user.repository');
jest.mock('jsonwebtoken');

describe('Auth Middleware', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockResponse = {};
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('should call next() when valid token provided', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com', role: 'DEVELOPER' };
      
      mockRequest = {
        headers: { authorization: 'Bearer valid-token' }
      };

      (jwt.verify as jest.Mock).mockReturnValue({ userId: 'user-123', role: 'DEVELOPER' });
      (UserRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      await requireAuth(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
      expect(mockRequest.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        role: 'DEVELOPER'
      });
    });

    it('should call next with UnauthorizedError when no authorization header', async () => {
      mockRequest = { headers: {} };

      await requireAuth(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      const error = nextFunction.mock.calls[0][0];
      expect(error.message).toBe('Missing or invalid authorization header');
    });

    it('should call next with UnauthorizedError when token does not start with Bearer', async () => {
      mockRequest = {
        headers: { authorization: 'Basic some-token' }
      };

      await requireAuth(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it('should call next with UnauthorizedError when user not found', async () => {
      mockRequest = {
        headers: { authorization: 'Bearer valid-token' }
      };

      (jwt.verify as jest.Mock).mockReturnValue({ userId: 'user-123' });
      (UserRepository.findById as jest.Mock).mockResolvedValue(null);

      await requireAuth(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      const error = nextFunction.mock.calls[0][0];
      expect(error.message).toBe('User not found');
    });

    it('should call next with UnauthorizedError when token is invalid', async () => {
      mockRequest = {
        headers: { authorization: 'Bearer invalid-token' }
      };

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await requireAuth(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      const error = nextFunction.mock.calls[0][0];
      expect(error.message).toBe('Invalid or expired token');
    });

    it('should call next with UnauthorizedError when JWT_SECRET is not defined', async () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      mockRequest = {
        headers: { authorization: 'Bearer some-token' }
      };

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('JWT_SECRET is not defined');
      });

      await requireAuth(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      
      process.env.JWT_SECRET = originalSecret;
    });
  });

  describe('requireRole', () => {
    it('should call next() when user has allowed role', () => {
      mockRequest = {
        user: { id: '1', email: 'test@example.com', role: 'MANAGER' }
      };

      const middleware = requireRole(['MANAGER', 'ADMIN']);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should call next with UnauthorizedError when no user on request', () => {
      mockRequest = {};

      const middleware = requireRole(['MANAGER']);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it('should call next with ForbiddenError when user role not allowed', () => {
      mockRequest = {
        user: { id: '1', email: 'test@example.com', role: 'DEVELOPER' }
      };

      const middleware = requireRole(['MANAGER', 'ADMIN']);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });
  });
});
