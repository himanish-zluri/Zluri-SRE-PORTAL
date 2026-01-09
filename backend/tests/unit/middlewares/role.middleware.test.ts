import { Response, NextFunction } from 'express';
import { requireManager, requireAdmin, requireManagerOrAdmin } from '../../../src/middlewares/auth.middleware';
import { AuthenticatedRequest } from '../../../src/middlewares/auth.middleware';

describe('Role Middleware', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockResponse = { status: statusMock, json: jsonMock };
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  describe('requireManager', () => {
    it('should call next() when user is MANAGER', () => {
      mockRequest = {
        user: { id: '1', email: 'manager@test.com', role: 'MANAGER' }
      };

      requireManager(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should return 401 when no user', () => {
      mockRequest = {};

      requireManager(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Unauthorized' });
    });

    it('should return 403 when user is not MANAGER', () => {
      mockRequest = {
        user: { id: '1', email: 'dev@test.com', role: 'DEVELOPER' }
      };

      requireManager(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Forbidden' });
    });
  });

  describe('requireAdmin', () => {
    it('should call next() when user is ADMIN', () => {
      mockRequest = {
        user: { id: '1', email: 'admin@test.com', role: 'ADMIN' }
      };

      requireAdmin(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should return 401 when no user', () => {
      mockRequest = {};

      requireAdmin(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should return 403 when user is not ADMIN', () => {
      mockRequest = {
        user: { id: '1', email: 'manager@test.com', role: 'MANAGER' }
      };

      requireAdmin(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Forbidden: Admin access required' });
    });
  });

  describe('requireManagerOrAdmin', () => {
    it('should call next() when user is MANAGER', () => {
      mockRequest = {
        user: { id: '1', email: 'manager@test.com', role: 'MANAGER' }
      };

      requireManagerOrAdmin(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should call next() when user is ADMIN', () => {
      mockRequest = {
        user: { id: '1', email: 'admin@test.com', role: 'ADMIN' }
      };

      requireManagerOrAdmin(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should return 401 when no user', () => {
      mockRequest = {};

      requireManagerOrAdmin(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should return 403 when user is DEVELOPER', () => {
      mockRequest = {
        user: { id: '1', email: 'dev@test.com', role: 'DEVELOPER' }
      };

      requireManagerOrAdmin(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Forbidden: Manager or Admin access required' });
    });
  });
});
