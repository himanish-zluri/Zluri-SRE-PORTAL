import { Response, Request } from 'express';
import { DatabaseController } from '../../../modules/databases/database.controller';
import { DatabaseService } from '../../../modules/databases/database.service';

jest.mock('../../../modules/databases/database.service');

describe('DatabaseController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    mockResponse = { json: jsonMock };
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

    it('should throw error on service error (caught by global handler)', async () => {
      (DatabaseService.listDatabasesFromInstance as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      mockRequest = {
        query: { instanceId: 'instance-1' }
      };

      await expect(DatabaseController.listDatabases(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow('Connection failed');
    });
  });
});
