import { Response, Request } from 'express';
import { DatabaseController } from '../../../src/modules/databases/database.controller';
import { DatabaseRepository } from '../../../src/modules/databases/database.repository';

jest.mock('../../../src/modules/databases/database.repository');

describe('DatabaseController', () => {
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

  describe('listDatabases', () => {
    it('should return databases for an instance', async () => {
      const mockDatabases = [
        { id: 'db-1', database_name: 'pg1' },
        { id: 'db-2', database_name: 'pg2' }
      ];
      (DatabaseRepository.findByInstanceId as jest.Mock).mockResolvedValue(mockDatabases);

      mockRequest = {
        query: { instanceId: 'instance-1' }
      };

      await DatabaseController.listDatabases(mockRequest as Request, mockResponse as Response);

      expect(DatabaseRepository.findByInstanceId).toHaveBeenCalledWith('instance-1');
      expect(jsonMock).toHaveBeenCalledWith(mockDatabases);
    });

    it('should return 400 when instanceId is missing', async () => {
      mockRequest = {
        query: {}
      };

      await DatabaseController.listDatabases(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'instanceId is required' });
    });
  });
});
