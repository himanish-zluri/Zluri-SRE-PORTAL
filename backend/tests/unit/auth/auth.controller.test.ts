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
    it('should return 200 with token on successful login', async () => {
      const mockResult = {
        token: 'mock-token',
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

    it('should return 500 on unexpected error', async () => {
      (AuthService.login as jest.Mock).mockRejectedValue(new Error('Database error'));

      mockRequest = {
        body: { email: 'test@example.com', password: 'password123' }
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
});
