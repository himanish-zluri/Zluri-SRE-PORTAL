import { UserRepository } from '../../../src/modules/users/user.repository';
import { pool } from '../../../src/config/db';

jest.mock('../../../src/config/db', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('UserRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com', role: 'DEVELOPER' };
      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockUser] });

      const result = await UserRepository.findByEmail('test@example.com');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE email = $1'),
        ['test@example.com']
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await UserRepository.findByEmail('unknown@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockUser] });

      const result = await UserRepository.findById('user-1');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        ['user-1']
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await UserRepository.findById('invalid-id');

      expect(result).toBeNull();
    });
  });
});
