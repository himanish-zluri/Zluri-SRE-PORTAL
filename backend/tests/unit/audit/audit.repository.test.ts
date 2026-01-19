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


  describe('findWithFilters', () => {
    it('should return all logs when no filters provided', async () => {
      const mockLogs = [{ id: 'log-1' }, { id: 'log-2' }];
      mockEntityManager.find.mockResolvedValue(mockLogs);

      const result = await AuditRepository.findWithFilters({});

      expect(mockEntityManager.find).toHaveBeenCalledWith(
        expect.any(Function),
        {},
        expect.objectContaining({
          limit: 100,
          offset: 0
        })
      );
      expect(result).toEqual(mockLogs);
    });

    it('should filter by userId', async () => {
      const mockLogs = [{ id: 'log-1' }];
      mockEntityManager.find.mockResolvedValue(mockLogs);

      const result = await AuditRepository.findWithFilters({ userId: 'user-1' });

      expect(mockEntityManager.find).toHaveBeenCalledWith(
        expect.any(Function),
        { performedBy: 'user-1' },
        expect.any(Object)
      );
      expect(result).toEqual(mockLogs);
    });

    it('should filter by databaseName', async () => {
      const mockLogs = [{ id: 'log-1' }];
      mockEntityManager.find.mockResolvedValue(mockLogs);

      const result = await AuditRepository.findWithFilters({ databaseName: 'prod_db' });

      expect(mockEntityManager.find).toHaveBeenCalledWith(
        expect.any(Function),
        { queryRequest: { databaseName: 'prod_db' } },
        expect.any(Object)
      );
      expect(result).toEqual(mockLogs);
    });

    it('should filter by action', async () => {
      const mockLogs = [{ id: 'log-1' }];
      mockEntityManager.find.mockResolvedValue(mockLogs);

      const result = await AuditRepository.findWithFilters({ action: 'EXECUTED' });

      expect(mockEntityManager.find).toHaveBeenCalledWith(
        expect.any(Function),
        { action: 'EXECUTED' },
        expect.any(Object)
      );
      expect(result).toEqual(mockLogs);
    });

    it('should filter by queryId with partial matching', async () => {
      const mockLogs = [{ id: 'log-1' }];
      mockEntityManager.find.mockResolvedValue(mockLogs);

      const result = await AuditRepository.findWithFilters({ queryId: 'abc123' });

      expect(mockEntityManager.find).toHaveBeenCalledWith(
        expect.any(Function),
        { queryRequest: { id: { $ilike: '%abc123%' } } },
        expect.any(Object)
      );
      expect(result).toEqual(mockLogs);
    });

    it('should filter by startDate only', async () => {
      const mockLogs = [{ id: 'log-1' }];
      mockEntityManager.find.mockResolvedValue(mockLogs);
      const startDate = new Date('2024-01-01');

      const result = await AuditRepository.findWithFilters({ startDate });

      expect(mockEntityManager.find).toHaveBeenCalledWith(
        expect.any(Function),
        { createdAt: { $gte: startDate } },
        expect.any(Object)
      );
      expect(result).toEqual(mockLogs);
    });

    it('should filter by endDate only', async () => {
      const mockLogs = [{ id: 'log-1' }];
      mockEntityManager.find.mockResolvedValue(mockLogs);
      const endDate = new Date('2024-12-31');

      const result = await AuditRepository.findWithFilters({ endDate });

      expect(mockEntityManager.find).toHaveBeenCalledWith(
        expect.any(Function),
        { createdAt: { $lte: endDate } },
        expect.any(Object)
      );
      expect(result).toEqual(mockLogs);
    });

    it('should filter by date range', async () => {
      const mockLogs = [{ id: 'log-1' }];
      mockEntityManager.find.mockResolvedValue(mockLogs);
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const result = await AuditRepository.findWithFilters({ startDate, endDate });

      expect(mockEntityManager.find).toHaveBeenCalledWith(
        expect.any(Function),
        { createdAt: { $gte: startDate, $lte: endDate } },
        expect.any(Object)
      );
      expect(result).toEqual(mockLogs);
    });

    it('should combine queryId with databaseName filters', async () => {
      const mockLogs = [{ id: 'log-1' }];
      mockEntityManager.find.mockResolvedValue(mockLogs);

      const result = await AuditRepository.findWithFilters({ 
        queryId: 'abc123',
        databaseName: 'prod_db'
      });

      expect(mockEntityManager.find).toHaveBeenCalledWith(
        expect.any(Function),
        { 
          queryRequest: { 
            id: { $ilike: '%abc123%' },
            databaseName: 'prod_db'
          }
        },
        expect.any(Object)
      );
      expect(result).toEqual(mockLogs);
    });

    it('should combine multiple filters', async () => {
      const mockLogs = [{ id: 'log-1' }];
      mockEntityManager.find.mockResolvedValue(mockLogs);

      const result = await AuditRepository.findWithFilters({
        userId: 'user-1',
        databaseName: 'prod_db',
        action: 'SUBMITTED',
        limit: 50,
        offset: 10,
      });

      expect(mockEntityManager.find).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          performedBy: 'user-1',
          action: 'SUBMITTED',
        }),
        expect.objectContaining({
          limit: 50,
          offset: 10,
        })
      );
      expect(result).toEqual(mockLogs);
    });
  });
