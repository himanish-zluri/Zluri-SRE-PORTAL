import { Response } from 'express';
import { DbInstanceController } from '../../../src/modules/db-instances/dbInstance.controller';
import { DbInstanceRepository } from '../../../src/modules/db-instances/dbInstance.repository';
import { DbInstanceDatabaseRepository } from '../../../src/modules/db-instances/dbInstanceDatabase.repository';
import { AuthenticatedRequest } from '../../../src/middlewares/auth.middleware';

jest.mock('../../../src/modules/db-instances/dbInstance.repository');
jest.mock('../../../src/modules/db-instances/dbInstanceDatabase.repository');

describe('DbInstanceController', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
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

      await DbInstanceController.listInstances(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(DbInstanceRepository.findAll).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(mockInstances);
    });

    it('should filter instances by type', async () => {
      const mockInstances = [{ id: '1', name: 'Postgres', type: 'POSTGRES' }];
      (DbInstanceRepository.findByType as jest.Mock).mockResolvedValue(mockInstances);

      mockRequest = { query: { type: 'POSTGRES' } };

      await DbInstanceController.listInstances(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(DbInstanceRepository.findByType).toHaveBeenCalledWith('POSTGRES');
      expect(jsonMock).toHaveBeenCalledWith(mockInstances);
    });
  });

  describe('listDatabases', () => {
    it('should return databases for instance', async () => {
      const mockDatabases = [{ id: '1', name: 'test_db' }];
      (DbInstanceDatabaseRepository.findByInstanceId as jest.Mock).mockResolvedValue(mockDatabases);

      mockRequest = { query: { instanceId: 'inst-1' } };

      await DbInstanceController.listDatabases(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(DbInstanceDatabaseRepository.findByInstanceId).toHaveBeenCalledWith('inst-1');
      expect(jsonMock).toHaveBeenCalledWith(mockDatabases);
    });

    it('should return 400 when instanceId missing', async () => {
      mockRequest = { query: {} };

      await DbInstanceController.listDatabases(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'instanceId is required' });
    });
  });
});
