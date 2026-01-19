import { Request, Response } from 'express';
import { PodsController } from '../../../modules/pods/pods.controller';
import { PodsRepository } from '../../../modules/pods/pods.repository';
import { NotFoundError } from '../../../errors';

jest.mock('../../../modules/pods/pods.repository');

describe('PodsController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    mockResponse = { json: jsonMock };
    jest.clearAllMocks();
  });

  // Helper to create mock pod entity
  const createMockPod = (id: string, name: string) => ({
    id,
    name,
    manager: { id: 'manager-1', name: 'Manager One' },
    createdAt: new Date('2025-01-15'),
  });

  describe('listPods', () => {
    it('should return all pods serialized', async () => {
      const mockPods = [
        createMockPod('pod-a', 'Pod A'),
        createMockPod('pod-b', 'Pod B'),
      ];
      (PodsRepository.findAll as jest.Mock).mockResolvedValue(mockPods);

      await PodsController.listPods(mockRequest as Request, mockResponse as Response);

      expect(PodsRepository.findAll).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ id: 'pod-a', name: 'Pod A', manager_id: 'manager-1', manager_name: 'Manager One' }),
        expect.objectContaining({ id: 'pod-b', name: 'Pod B', manager_id: 'manager-1', manager_name: 'Manager One' }),
      ]));
    });
  });

  describe('getPod', () => {
    it('should return pod by id serialized', async () => {
      const mockPod = createMockPod('pod-a', 'Pod A');
      (PodsRepository.findById as jest.Mock).mockResolvedValue(mockPod);

      mockRequest = { params: { id: 'pod-a' } };

      await PodsController.getPod(mockRequest as Request, mockResponse as Response);

      expect(PodsRepository.findById).toHaveBeenCalledWith('pod-a');
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        id: 'pod-a',
        name: 'Pod A',
        manager_id: 'manager-1',
        manager_name: 'Manager One',
      }));
    });

    it('should throw NotFoundError when pod not found', async () => {
      (PodsRepository.findById as jest.Mock).mockResolvedValue(null);

      mockRequest = { params: { id: 'invalid' } };

      await expect(PodsController.getPod(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(NotFoundError);
    });
  });
});
