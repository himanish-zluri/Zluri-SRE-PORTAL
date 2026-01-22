import { UserRepository } from '../../../modules/users/user.repository';
import { getEntityManager } from '../../../config/database';

// Mock the getEntityManager function
jest.mock('../../../config/database', () => ({
  getEntityManager: jest.fn()
}));

const mockGetEntityManager = getEntityManager as jest.MockedFunction<typeof getEntityManager>;

// Create a mock entity manager
const mockEntityManager = {
  find: jest.fn(),
  findOne: jest.fn(),
  findOneOrFail: jest.fn(),
  count: jest.fn(),
  persistAndFlush: jest.fn(),
  flush: jest.fn(),
  nativeDelete: jest.fn(),
  fork: jest.fn(),
  createQueryBuilder: jest.fn(),
};

describe('UserRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure getEntityManager returns our mock
    mockGetEntityManager.mockReturnValue(mockEntityManager as any);
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

  describe('findAll', () => {
    it('should return all users ordered by name', async () => {
      const mockUsers = [
        { id: 'user-1', name: 'Alice', email: 'alice@test.com' },
        { id: 'user-2', name: 'Bob', email: 'bob@test.com' },
      ];
      mockEntityManager.find.mockResolvedValue(mockUsers);

      const result = await UserRepository.findAll();

      expect(mockEntityManager.find).toHaveBeenCalledWith(
        expect.any(Function),
        {},
        { orderBy: { name: 'ASC' } }
      );
      expect(result).toEqual(mockUsers);
    });

    it('should return empty array when no users', async () => {
      mockEntityManager.find.mockResolvedValue([]);

      const result = await UserRepository.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('updateSlackId', () => {
    it('should update user slack ID', async () => {
      const mockUser: any = { id: 'user-1', slackId: undefined };
      mockEntityManager.findOneOrFail.mockResolvedValue(mockUser);
      mockEntityManager.flush.mockResolvedValue(undefined);

      await UserRepository.updateSlackId('user-1', 'U12345ABC');

      expect(mockEntityManager.findOneOrFail).toHaveBeenCalledWith(
        expect.any(Function),
        { id: 'user-1' }
      );
      expect(mockUser.slackId).toBe('U12345ABC');
      expect(mockEntityManager.flush).toHaveBeenCalled();
    });

    it('should clear slack ID when null provided', async () => {
      const mockUser: any = { id: 'user-1', slackId: 'U12345ABC' };
      mockEntityManager.findOneOrFail.mockResolvedValue(mockUser);
      mockEntityManager.flush.mockResolvedValue(undefined);

      await UserRepository.updateSlackId('user-1', null);

      expect(mockUser.slackId).toBeUndefined();
      expect(mockEntityManager.flush).toHaveBeenCalled();
    });

    it('should clear slack ID when empty string provided', async () => {
      const mockUser: any = { id: 'user-1', slackId: 'U12345ABC' };
      mockEntityManager.findOneOrFail.mockResolvedValue(mockUser);
      mockEntityManager.flush.mockResolvedValue(undefined);

      await UserRepository.updateSlackId('user-1', '');

      expect(mockUser.slackId).toBeUndefined();
      expect(mockEntityManager.flush).toHaveBeenCalled();
    });
  });

  describe('getUserPods', () => {
    it('should return pods managed by user', async () => {
      const mockPods = [
        { id: 'pod-1', name: 'Pod A', manager: { id: 'user-1' } },
        { id: 'pod-2', name: 'Pod B', manager: { id: 'user-1' } },
      ];
      mockEntityManager.find.mockResolvedValue(mockPods);

      const result = await UserRepository.getUserPods('user-1');

      expect(mockEntityManager.find).toHaveBeenCalledWith(
        expect.any(Function),
        { manager: { id: 'user-1' } }
      );
      expect(result).toEqual(mockPods);
    });

    it('should return empty array when user manages no pods', async () => {
      mockEntityManager.find.mockResolvedValue([]);

      const result = await UserRepository.getUserPods('user-1');

      expect(result).toEqual([]);
    });
  });
});
