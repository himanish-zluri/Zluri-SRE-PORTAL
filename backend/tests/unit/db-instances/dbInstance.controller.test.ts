import { Response, Request } from 'express';
import { DbInstanceController } from '../../../src/modules/db-instances/dbInstance.controller';
import { DbInstanceRepository } from '../../../src/modules/db-instances/dbInstance.repository';

jest.mock('../../../src/modules/db-instances/dbInstance.repository');

describe('DbInstanceController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockResponse = { json: jsonMock, status: statusMock };
    jest.clearAllMocks();
  });

  describe('listInstances', () => {
    it('should return all instances when no type filter', async () => {
      const mockInstances = [{ id: '1', name: 'Postgres' }];
      (DbInstanceRepository.findAll as jest.Mock).mockResolvedValue(mockInstances);

      mockRequest = { query: {} };

      await DbInstanceController.listInstances(mockRequest as Request, mockResponse as Response);

      expect(DbInstanceRepository.findAll).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(mockInstances);
    });

    it('should filter instances by type', async () => {
      const mockInstances = [{ id: '1', name: 'Postgres', type: 'POSTGRES' }];
      (DbInstanceRepository.findByType as jest.Mock).mockResolvedValue(mockInstances);

      mockRequest = { query: { type: 'POSTGRES' } };

      await DbInstanceController.listInstances(mockRequest as Request, mockResponse as Response);

      expect(DbInstanceRepository.findByType).toHaveBeenCalledWith('POSTGRES');
      expect(jsonMock).toHaveBeenCalledWith(mockInstances);
    });
  });
});
