import { UserRepository } from '../../../src/modules/users/user.repository';
import { mockEntityManager } from '../../__mocks__/database';

describe('UserRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com', role: 'DEVELOPER' };
      mockEntityManager.findOne.mockResolvedValue(mockUser);

      const result = await UserRepository.findByEmail('test@example.com');

      expect(mockEntityManager.findOne).toHaveBeenCalledWith(
        expect.any(Function),
        { email: 'test@example.com' }
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockEntityManager.findOne.mockResolvedValue(null);

      const result = await UserRepository.findByEmail('unknown@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      mockEntityManager.findOne.mockResolvedValue(mockUser);

      const result = await UserRepository.findById('user-1');

      expect(mockEntityManager.findOne).toHaveBeenCalledWith(
        expect.any(Function),
        { id: 'user-1' }
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockEntityManager.findOne.mockResolvedValue(null);

      const result = await UserRepository.findById('invalid-id');

      expect(result).toBeNull();
    });
  });
});
