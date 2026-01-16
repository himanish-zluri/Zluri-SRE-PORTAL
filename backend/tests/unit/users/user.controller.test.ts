import { Response } from 'express';
import { UserController } from '../../../src/modules/users/user.controller';
import { UserRepository } from '../../../src/modules/users/user.repository';
import { AuthenticatedRequest } from '../../../src/middlewares/auth.middleware';

jest.mock('../../../src/modules/users/user.repository');

describe('UserController', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnThis();
    mockResponse = { json: jsonMock, status: statusMock };
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all users with safe fields only', async () => {
      const mockUsers = [
        { id: 'user-1', name: 'User One', email: 'user1@test.com', role: 'USER', passwordHash: 'secret' },
        { id: 'user-2', name: 'User Two', email: 'user2@test.com', role: 'ADMIN', passwordHash: 'secret' },
      ];
      (UserRepository.findAll as jest.Mock).mockResolvedValue(mockUsers);

      mockRequest = {
        user: { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' },
      };

      await UserController.getAll(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(UserRepository.findAll).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith([
        { id: 'user-1', name: 'User One', email: 'user1@test.com', role: 'USER' },
        { id: 'user-2', name: 'User Two', email: 'user2@test.com', role: 'ADMIN' },
      ]);
      // Ensure passwordHash is not included
      const result = jsonMock.mock.calls[0][0];
      expect(result[0]).not.toHaveProperty('passwordHash');
    });

    it('should return empty array when no users', async () => {
      (UserRepository.findAll as jest.Mock).mockResolvedValue([]);

      mockRequest = {
        user: { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' },
      };

      await UserController.getAll(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith([]);
    });
  });

  describe('updateSlackId', () => {
    it('should update slack ID successfully', async () => {
      (UserRepository.updateSlackId as jest.Mock).mockResolvedValue(undefined);

      mockRequest = {
        user: { id: 'user-1', email: 'user@test.com', role: 'DEVELOPER' },
        body: { slackId: 'U12345ABC' },
      };

      await UserController.updateSlackId(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(UserRepository.updateSlackId).toHaveBeenCalledWith('user-1', 'U12345ABC');
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Slack ID updated successfully' });
    });

    it('should clear slack ID when empty string provided', async () => {
      (UserRepository.updateSlackId as jest.Mock).mockResolvedValue(undefined);

      mockRequest = {
        user: { id: 'user-1', email: 'user@test.com', role: 'DEVELOPER' },
        body: { slackId: '' },
      };

      await UserController.updateSlackId(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(UserRepository.updateSlackId).toHaveBeenCalledWith('user-1', null);
    });

    it('should clear slack ID when not provided', async () => {
      (UserRepository.updateSlackId as jest.Mock).mockResolvedValue(undefined);

      mockRequest = {
        user: { id: 'user-1', email: 'user@test.com', role: 'DEVELOPER' },
        body: {},
      };

      await UserController.updateSlackId(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(UserRepository.updateSlackId).toHaveBeenCalledWith('user-1', null);
    });
  });

  describe('getProfile', () => {
    it('should return user profile with slack ID', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'Test User',
        email: 'user@test.com',
        role: 'USER',
        slackId: 'U12345ABC',
      };
      (UserRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      mockRequest = {
        user: { id: 'user-1', email: 'user@test.com', role: 'DEVELOPER' },
      };

      await UserController.getProfile(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(UserRepository.findById).toHaveBeenCalledWith('user-1');
      expect(jsonMock).toHaveBeenCalledWith({
        id: 'user-1',
        name: 'Test User',
        email: 'user@test.com',
        role: 'USER',
        slackId: 'U12345ABC',
      });
    });

    it('should return 404 when user not found', async () => {
      (UserRepository.findById as jest.Mock).mockResolvedValue(null);

      mockRequest = {
        user: { id: 'user-1', email: 'user@test.com', role: 'DEVELOPER' },
      };

      await UserController.getProfile(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'User not found' });
    });
  });
});
