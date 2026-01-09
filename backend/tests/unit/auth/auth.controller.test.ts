import { Request, Response } from 'express';
import { AuthController } from '../../../src/modules/auth/auth.controller';
import { AuthService } from '../../../src/modules/auth/auth.service';

jest.mock('../../../src/modules/auth/auth.service');

describe('AuthController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockResponse = {
      json: jsonMock,
      status: statusMock
    };
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return 200 with tokens on successful login', async () => {
      const mockResult = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        user: { id: '1', email: 'test@example.com', name: 'Test', role: 'DEVELOPER' }
      };
      (AuthService.login as jest.Mock).mockResolvedValue(mockResult);

      mockRequest = {
        body: { email: 'test@example.com', password: 'password123' }
      };

      await AuthController.login(mockRequest as Request, mockResponse as Response);

      expect(AuthService.login).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(jsonMock).toHaveBeenCalledWith(mockResult);
    });

    it('should return 401 on invalid credentials', async () => {
      (AuthService.login as jest.Mock).mockRejectedValue(new Error('Invalid credentials'));

      mockRequest = {
        body: { email: 'test@example.com', password: 'wrongpassword' }
      };

      await AuthController.login(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Invalid email or password' });
    });

    it('should return 400 when email missing', async () => {
      mockRequest = {
        body: { password: 'password123' }
      };

      await AuthController.login(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Email and password are required' });
    });

    it('should return 400 when password missing', async () => {
      mockRequest = {
        body: { email: 'test@example.com' }
      };

      await AuthController.login(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Email and password are required' });
    });
  });

  describe('refresh', () => {
    it('should return 200 with new access token', async () => {
      const mockResult = {
        accessToken: 'new-access-token',
        user: { id: '1', email: 'test@example.com', name: 'Test', role: 'DEVELOPER' }
      };
      (AuthService.refresh as jest.Mock).mockResolvedValue(mockResult);

      mockRequest = {
        body: { refreshToken: 'valid-refresh-token' }
      };

      await AuthController.refresh(mockRequest as Request, mockResponse as Response);

      expect(AuthService.refresh).toHaveBeenCalledWith('valid-refresh-token');
      expect(jsonMock).toHaveBeenCalledWith(mockResult);
    });

    it('should return 400 when refresh token missing', async () => {
      mockRequest = {
        body: {}
      };

      await AuthController.refresh(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Refresh token is required' });
    });

    it('should return 401 on invalid refresh token', async () => {
      (AuthService.refresh as jest.Mock).mockRejectedValue(new Error('Invalid token'));

      mockRequest = {
        body: { refreshToken: 'invalid-token' }
      };

      await AuthController.refresh(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Invalid or expired refresh token' });
    });
  });

  describe('logout', () => {
    it('should return 200 on successful logout', async () => {
      (AuthService.logout as jest.Mock).mockResolvedValue(undefined);

      mockRequest = {
        body: { refreshToken: 'valid-refresh-token' }
      };

      await AuthController.logout(mockRequest as Request, mockResponse as Response);

      expect(AuthService.logout).toHaveBeenCalledWith('valid-refresh-token');
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Logged out successfully' });
    });

    it('should return 400 when refresh token missing', async () => {
      mockRequest = {
        body: {}
      };

      await AuthController.logout(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Refresh token is required' });
    });

    it('should return 500 on logout error', async () => {
      (AuthService.logout as jest.Mock).mockRejectedValue(new Error('DB error'));

      mockRequest = {
        body: { refreshToken: 'valid-token' }
      };

      await AuthController.logout(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Failed to logout' });
    });
  });

  describe('logoutAll', () => {
    it('should return 200 on successful logout from all devices', async () => {
      (AuthService.logoutAll as jest.Mock).mockResolvedValue(undefined);

      mockRequest = {
        user: { id: 'user-1', email: 'test@test.com', role: 'DEVELOPER' }
      } as any;

      await AuthController.logoutAll(mockRequest as any, mockResponse as Response);

      expect(AuthService.logoutAll).toHaveBeenCalledWith('user-1');
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Logged out from all devices' });
    });

    it('should return 500 on logoutAll error', async () => {
      (AuthService.logoutAll as jest.Mock).mockRejectedValue(new Error('DB error'));

      mockRequest = {
        user: { id: 'user-1', email: 'test@test.com', role: 'DEVELOPER' }
      } as any;

      await AuthController.logoutAll(mockRequest as any, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Failed to logout' });
    });
  });
});
