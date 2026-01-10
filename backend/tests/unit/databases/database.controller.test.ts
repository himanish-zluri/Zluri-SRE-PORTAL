import { Response, Request } from 'express';
import { DatabaseController } from '../../../src/modules/databases/database.controller';
import { DatabaseService } from '../../../src/modules/databases/database.service';

jest.mock('../../../src/modules/databases/database.service');

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
      const mockDatabases = ['pg1', 'pg2'];
      (DatabaseService.listDatabasesFromInstance as jest.Mock).mockResolvedValue(mockDatabases);

      mockRequest = {
        query: { instanceId: 'instance-1' }
      };

      await DatabaseController.listDatabases(mockRequest as Request, mockResponse as Response);

      expect(DatabaseService.listDatabasesFromInstance).toHaveBeenCalledWith('instance-1');
      expect(jsonMock).toHaveBeenCalledWith([
        { database_name: 'pg1' },
        { database_name: 'pg2' }
      ]);
    });

    it('should return 400 when instanceId is missing', async () => {
      mockRequest = {
        query: {}
      };

      await DatabaseController.listDatabases(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'instanceId is required' });
    });

    it('should return 500 on service error', async () => {
      (DatabaseService.listDatabasesFromInstance as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      mockRequest = {
        query: { instanceId: 'instance-1' }
      };

      await DatabaseController.listDatabases(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Failed to list databases',
        error: 'Connection failed'
      });
    });
  });
});
