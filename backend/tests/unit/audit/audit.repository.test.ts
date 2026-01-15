import { AuditRepository } from '../../../src/modules/audit/audit.repository';
import { mockEntityManager } from '../../__mocks__/database';

describe('AuditRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('log', () => {
    it('should insert audit log entry', async () => {
      const mockQueryRequest = { id: 'query-1' };
      const mockUser = { id: 'user-1', name: 'User One' };
      mockEntityManager.findOneOrFail
        .mockResolvedValueOnce(mockQueryRequest)
        .mockResolvedValueOnce(mockUser);
      mockEntityManager.persistAndFlush.mockResolvedValue(undefined);

      await AuditRepository.log({
        queryRequestId: 'query-1',
        action: 'SUBMITTED',
        performedBy: 'user-1',
        details: { podId: 'pod-a' }
      });

      expect(mockEntityManager.findOneOrFail).toHaveBeenCalledTimes(2);
      expect(mockEntityManager.persistAndFlush).toHaveBeenCalled();
    });

    it('should insert audit log without details', async () => {
      const mockQueryRequest = { id: 'query-1' };
      const mockUser = { id: 'manager-1' };
      mockEntityManager.findOneOrFail
        .mockResolvedValueOnce(mockQueryRequest)
        .mockResolvedValueOnce(mockUser);
      mockEntityManager.persistAndFlush.mockResolvedValue(undefined);

      await AuditRepository.log({
        queryRequestId: 'query-1',
        action: 'APPROVED',
        performedBy: 'manager-1'
      });

      expect(mockEntityManager.persistAndFlush).toHaveBeenCalled();
    });
  });

  describe('findByQueryId', () => {
    it('should return audit logs for a query', async () => {
      const mockLogs = [
        { id: 'log-1', action: 'SUBMITTED', performedBy: { name: 'User 1' } },
        { id: 'log-2', action: 'EXECUTED', performedBy: { name: 'Manager 1' } }
      ];
      mockEntityManager.find.mockResolvedValue(mockLogs);

      const result = await AuditRepository.findByQueryId('query-1');

      expect(mockEntityManager.find).toHaveBeenCalledWith(
        expect.any(Function),
        { queryRequest: 'query-1' },
        expect.objectContaining({
          populate: ['performedBy'],
          orderBy: { createdAt: 'ASC' }
        })
      );
      expect(result).toEqual(mockLogs);
    });
  });

  describe('findByUserId', () => {
    it('should return audit logs for a specific user', async () => {
      const mockLogs = [
        { id: 'log-1', action: 'SUBMITTED', performedBy: { id: 'user-1', name: 'User One' } },
        { id: 'log-2', action: 'APPROVED', performedBy: { id: 'user-1', name: 'User One' } }
      ];
      mockEntityManager.find.mockResolvedValue(mockLogs);

      const result = await AuditRepository.findByUserId('user-1');

      expect(mockEntityManager.find).toHaveBeenCalledWith(
        expect.any(Function),
        { performedBy: 'user-1' },
        expect.objectContaining({
          populate: ['performedBy', 'queryRequest'],
          orderBy: { createdAt: 'DESC' },
          limit: 100,
          offset: 0
        })
      );
      expect(result).toEqual(mockLogs);
    });

    it('should return audit logs with custom pagination', async () => {
      const mockLogs = [{ id: 'log-1' }];
      mockEntityManager.find.mockResolvedValue(mockLogs);

      const result = await AuditRepository.findByUserId('user-1', 50, 10);

      expect(mockEntityManager.find).toHaveBeenCalledWith(
        expect.any(Function),
        { performedBy: 'user-1' },
        expect.objectContaining({
          limit: 50,
          offset: 10
        })
      );
      expect(result).toEqual(mockLogs);
    });
  });

  describe('findAll', () => {
    it('should return all audit logs with pagination', async () => {
      const mockLogs = [{ id: 'log-1' }, { id: 'log-2' }];
      mockEntityManager.find.mockResolvedValue(mockLogs);

      const result = await AuditRepository.findAll(50, 10);

      expect(mockEntityManager.find).toHaveBeenCalledWith(
        expect.any(Function),
        {},
        expect.objectContaining({
          limit: 50,
          offset: 10
        })
      );
      expect(result).toEqual(mockLogs);
    });

    it('should use default pagination values', async () => {
      mockEntityManager.find.mockResolvedValue([]);

      await AuditRepository.findAll();

      expect(mockEntityManager.find).toHaveBeenCalledWith(
        expect.any(Function),
        {},
        expect.objectContaining({
          limit: 100,
          offset: 0
        })
      );
    });
  });

  describe('findByDatabaseName', () => {
    it('should return audit logs for a specific database', async () => {
      const mockLogs = [
        { id: 'log-1', action: 'SUBMITTED', queryRequest: { databaseName: 'production_db' } },
        { id: 'log-2', action: 'EXECUTED', queryRequest: { databaseName: 'production_db' } }
      ];
      mockEntityManager.find.mockResolvedValue(mockLogs);

      const result = await AuditRepository.findByDatabaseName('production_db');

      expect(mockEntityManager.find).toHaveBeenCalledWith(
        expect.any(Function),
        { queryRequest: { databaseName: 'production_db' } },
        expect.objectContaining({
          limit: 100,
          offset: 0
        })
      );
      expect(result).toEqual(mockLogs);
    });

    it('should return audit logs with custom pagination', async () => {
      const mockLogs = [{ id: 'log-1' }];
      mockEntityManager.find.mockResolvedValue(mockLogs);

      const result = await AuditRepository.findByDatabaseName('staging_db', 50, 10);

      expect(mockEntityManager.find).toHaveBeenCalledWith(
        expect.any(Function),
        { queryRequest: { databaseName: 'staging_db' } },
        expect.objectContaining({
          limit: 50,
          offset: 10
        })
      );
      expect(result).toEqual(mockLogs);
    });
  });
});
