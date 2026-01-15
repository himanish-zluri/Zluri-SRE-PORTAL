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
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(mockResult);
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
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(mockResult);
    });

    it('should throw error on invalid refresh token (caught by global handler)', async () => {
      const error = new Error('Invalid or expired refresh token');
      (AuthService.refresh as jest.Mock).mockRejectedValue(error);

      mockRequest = {
        body: { refreshToken: 'invalid-token' }
      };

      await expect(AuthController.refresh(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow('Invalid or expired refresh token');
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
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Logged out successfully' });
    });

    it('should throw error on logout failure (caught by global handler)', async () => {
      const error = new Error('DB error');
      (AuthService.logout as jest.Mock).mockRejectedValue(error);

      mockRequest = {
        body: { refreshToken: 'valid-token' }
      };

      await expect(AuthController.logout(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow('DB error');
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
