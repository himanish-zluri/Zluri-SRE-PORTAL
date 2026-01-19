import { PodsRepository } from '../../../modules/pods/pods.repository';
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

describe('PodsRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure getEntityManager returns our mock
    mockGetEntityManager.mockReturnValue(mockEntityManager as any);
  });

  describe('findAll', () => {
    it('should return all pods', async () => {
      const mockPods = [
        { id: 'pod-a', name: 'Pod A' },
        { id: 'pod-b', name: 'Pod B' }
      ];
      mockEntityManager.find.mockResolvedValue(mockPods);

      const result = await PodsRepository.findAll();

      expect(mockEntityManager.find).toHaveBeenCalledWith(
        expect.any(Function),
        {},
        expect.objectContaining({
          populate: ['manager'],
          orderBy: { name: 'ASC' }
        })
      );
      expect(result).toEqual(mockPods);
    });
  });

  describe('findById', () => {
    it('should return pod when found', async () => {
      const mockPod = { id: 'pod-a', name: 'Pod A', manager: { id: 'manager-1' } };
      mockEntityManager.findOne.mockResolvedValue(mockPod);

      const result = await PodsRepository.findById('pod-a');

      expect(mockEntityManager.findOne).toHaveBeenCalledWith(
        expect.any(Function),
        { id: 'pod-a' },
        expect.objectContaining({ populate: ['manager'] })
      );
      expect(result).toEqual(mockPod);
    });

    it('should return null when pod not found', async () => {
      mockEntityManager.findOne.mockResolvedValue(null);

      const result = await PodsRepository.findById('unknown-pod');

      expect(result).toBeNull();
    });
  });
});
