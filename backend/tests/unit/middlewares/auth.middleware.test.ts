import { Response, NextFunction } from 'express';
import { requireAuth, requireRole, AuthenticatedRequest } from '../../../src/middlewares/auth.middleware';
import { UserRepository } from '../../../src/modules/users/user.repository';
import jwt from 'jsonwebtoken';

jest.mock('../../../src/modules/users/user.repository');
jest.mock('jsonwebtoken');

describe('Auth Middleware', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockResponse = {
      status: statusMock,
      json: jsonMock
    };
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

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        role: 'DEVELOPER'
      });
    });

    it('should return 401 when no authorization header', async () => {
      mockRequest = { headers: {} };

      await requireAuth(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Unauthorized' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when token does not start with Bearer', async () => {
      mockRequest = {
        headers: { authorization: 'Basic some-token' }
      };

      await requireAuth(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Unauthorized' });
    });

    it('should return 401 when user not found', async () => {
      mockRequest = {
        headers: { authorization: 'Bearer valid-token' }
      };

      (jwt.verify as jest.Mock).mockReturnValue({ userId: 'user-123' });
      (UserRepository.findById as jest.Mock).mockResolvedValue(null);

      await requireAuth(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Unauthorized' });
    });

    it('should return 401 when token is invalid', async () => {
      mockRequest = {
        headers: { authorization: 'Bearer invalid-token' }
      };

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await requireAuth(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Unauthorized' });
    });
  });

  describe('requireRole', () => {
    it('should call next() when user has allowed role', () => {
      mockRequest = {
        user: { id: '1', email: 'test@example.com', role: 'MANAGER' }
      };

      const middleware = requireRole(['MANAGER', 'ADMIN']);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should return 401 when no user on request', () => {
      mockRequest = {};

      const middleware = requireRole(['MANAGER']);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Unauthorized' });
    });

    it('should return 403 when user role not allowed', () => {
      mockRequest = {
        user: { id: '1', email: 'test@example.com', role: 'DEVELOPER' }
      };

      const middleware = requireRole(['MANAGER', 'ADMIN']);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Forbidden' });
    });
  });
});
