import { Request, Response } from 'express';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';

jest.mock('../auth.service');

describe('AuthController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let cookieMock: jest.Mock;
  let clearCookieMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    cookieMock = jest.fn();
    clearCookieMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockResponse = {
      json: jsonMock,
      status: statusMock,
      cookie: cookieMock,
      clearCookie: clearCookieMock
    };
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return 200 with access token and set HttpOnly cookie for refresh token', async () => {
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
      
      // Should set HttpOnly cookie for refresh token
      expect(cookieMock).toHaveBeenCalledWith('refreshToken', 'mock-refresh-token', {
        httpOnly: true,
        secure: false, // false in test environment
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/'
      });

      expect(statusMock).toHaveBeenCalledWith(200);
      // Should NOT include refresh token in response body
      expect(jsonMock).toHaveBeenCalledWith({
        accessToken: 'mock-access-token',
        user: { id: '1', email: 'test@example.com', name: 'Test', role: 'DEVELOPER' }
      });
    });

    it('should throw error on invalid credentials (caught by global handler)', async () => {
      const error = new Error('Invalid email or password');
      (AuthService.login as jest.Mock).mockRejectedValue(error);

      mockRequest = {
        body: { email: 'test@example.com', password: 'wrongpassword' }
      };

      await expect(AuthController.login(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow('Invalid email or password');
    });
  });

  describe('refresh', () => {
    it('should return 200 with new access token when refresh token cookie exists', async () => {
      const mockResult = {
        accessToken: 'new-access-token',
        user: { id: '1', email: 'test@example.com', name: 'Test', role: 'DEVELOPER' }
      };
      (AuthService.refresh as jest.Mock).mockResolvedValue(mockResult);

      mockRequest = {
        cookies: { refreshToken: 'valid-refresh-token' }
      };

      await AuthController.refresh(mockRequest as Request, mockResponse as Response);

      expect(AuthService.refresh).toHaveBeenCalledWith('valid-refresh-token');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(mockResult);
    });

    it('should return 401 when refresh token cookie is missing', async () => {
      mockRequest = {
        cookies: {} // No refresh token cookie
      };

      await AuthController.refresh(mockRequest as Request, mockResponse as Response);

      expect(AuthService.refresh).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Refresh token not found' });
    });

    it('should throw error on invalid refresh token (caught by global handler)', async () => {
      const error = new Error('Invalid or expired refresh token');
      (AuthService.refresh as jest.Mock).mockRejectedValue(error);

      mockRequest = {
        cookies: { refreshToken: 'invalid-token' }
      };

      await expect(AuthController.refresh(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow('Invalid or expired refresh token');
    });
  });

  describe('logout', () => {
    it('should return 200 and clear refresh token cookie on successful logout', async () => {
      (AuthService.logout as jest.Mock).mockResolvedValue(undefined);

      mockRequest = {
        cookies: { refreshToken: 'valid-refresh-token' }
      };

      await AuthController.logout(mockRequest as Request, mockResponse as Response);

      expect(AuthService.logout).toHaveBeenCalledWith('valid-refresh-token');
      
      // Should clear the refresh token cookie
      expect(clearCookieMock).toHaveBeenCalledWith('refreshToken', {
        httpOnly: true,
        secure: false, // false in test environment
        sameSite: 'strict',
        path: '/'
      });

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Logged out successfully' });
    });

    it('should return 200 and clear cookie even when no refresh token exists', async () => {
      mockRequest = {
        cookies: {} // No refresh token
      };

      await AuthController.logout(mockRequest as Request, mockResponse as Response);

      expect(AuthService.logout).not.toHaveBeenCalled();
      expect(clearCookieMock).toHaveBeenCalledWith('refreshToken', {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        path: '/'
      });
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Logged out successfully' });
    });

    it('should throw error on logout failure (caught by global handler)', async () => {
      const error = new Error('DB error');
      (AuthService.logout as jest.Mock).mockRejectedValue(error);

      mockRequest = {
        cookies: { refreshToken: 'valid-token' }
      };

      await expect(AuthController.logout(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow('DB error');
    });
  });

  describe('logoutAll', () => {
    it('should return 200 and clear refresh token cookie on successful logout from all devices', async () => {
      (AuthService.logoutAll as jest.Mock).mockResolvedValue(undefined);

      mockRequest = {
        user: { id: 'user-1', email: 'test@test.com', role: 'DEVELOPER' }
      } as any;

      await AuthController.logoutAll(mockRequest as any, mockResponse as Response);

      expect(AuthService.logoutAll).toHaveBeenCalledWith('user-1');
      
      // Should clear the refresh token cookie
      expect(clearCookieMock).toHaveBeenCalledWith('refreshToken', {
        httpOnly: true,
        secure: false, // false in test environment
        sameSite: 'strict',
        path: '/'
      });

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Logged out from all devices' });
    });

    it('should throw error on logoutAll failure (caught by global handler)', async () => {
      const error = new Error('DB error');
      (AuthService.logoutAll as jest.Mock).mockRejectedValue(error);

      mockRequest = {
        user: { id: 'user-1', email: 'test@test.com', role: 'DEVELOPER' }
      } as any;

      await expect(AuthController.logoutAll(mockRequest as any, mockResponse as Response))
        .rejects.toThrow('DB error');
    });
  });
});
