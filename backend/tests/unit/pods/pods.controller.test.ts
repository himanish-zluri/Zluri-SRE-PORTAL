import { Request, Response } from 'express';
import { PodsController } from '../../../src/modules/pods/pods.controller';
import { PodsRepository } from '../../../src/modules/pods/pods.repository';
import { NotFoundError } from '../../../src/errors';

jest.mock('../../../src/modules/pods/pods.repository');

describe('PodsController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    mockResponse = { json: jsonMock };
    jest.clearAllMocks();
  });

  describe('listPods', () => {
    it('should return all pods', async () => {
      const mockPods = [
        { id: 'pod-a', name: 'Pod A' },
        { id: 'pod-b', name: 'Pod B' }
      ];
      (PodsRepository.findAll as jest.Mock).mockResolvedValue(mockPods);

      await PodsController.listPods(mockRequest as Request, mockResponse as Response);

      expect(PodsRepository.findAll).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(mockPods);
    });
  });

  describe('getPod', () => {
    it('should return pod by id', async () => {
      const mockPod = { id: 'pod-a', name: 'Pod A' };
      (PodsRepository.findById as jest.Mock).mockResolvedValue(mockPod);

      mockRequest = { params: { id: 'pod-a' } };

      await PodsController.getPod(mockRequest as Request, mockResponse as Response);

      expect(PodsRepository.findById).toHaveBeenCalledWith('pod-a');
      expect(jsonMock).toHaveBeenCalledWith(mockPod);
    });

    it('should throw NotFoundError when pod not found', async () => {
      (PodsRepository.findById as jest.Mock).mockResolvedValue(null);

      mockRequest = { params: { id: 'invalid' } };

      await expect(PodsController.getPod(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(NotFoundError);
    });
  });
});
