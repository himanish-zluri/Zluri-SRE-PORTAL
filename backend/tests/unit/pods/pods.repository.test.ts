import { PodsRepository } from '../../../src/modules/pods/pods.repository';
import { pool } from '../../../src/config/db';

jest.mock('../../../src/config/db', () => ({
  pool: {
    query: jest.fn()
  }
}));

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
      (pool.query as jest.Mock).mockResolvedValue({ rows: mockPods });

      const result = await PodsRepository.findAll();

      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'));
      expect(result).toEqual(mockPods);
    });
  });

  describe('findById', () => {
    it('should return pod when found', async () => {
      const mockPod = { id: 'pod-a', name: 'Pod A', manager_id: 'manager-1' };
      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockPod] });

      const result = await PodsRepository.findById('pod-a');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE p.id = $1'),
        ['pod-a']
      );
      expect(result).toEqual(mockPod);
    });

    it('should return null when pod not found', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await PodsRepository.findById('unknown-pod');

      expect(result).toBeNull();
    });
  });
});
