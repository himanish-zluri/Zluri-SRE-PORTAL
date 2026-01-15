import { PodsRepository } from '../../../src/modules/pods/pods.repository';
import { mockEntityManager } from '../../__mocks__/database';

describe('PodsRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
