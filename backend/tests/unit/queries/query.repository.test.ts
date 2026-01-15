import { QueryRepository } from '../../../src/modules/queries/query.repository';
import { mockEntityManager } from '../../__mocks__/database';

describe('QueryRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return query when found', async () => {
      const mockQuery = { id: 'query-1', status: 'PENDING' };
      mockEntityManager.findOne.mockResolvedValue(mockQuery);

      const result = await QueryRepository.findById('query-1');

      expect(mockEntityManager.findOne).toHaveBeenCalledWith(
        expect.any(Function),
        { id: 'query-1' },
        expect.objectContaining({
          populate: ['requester', 'pod', 'instance', 'approvedBy']
        })
      );
      expect(result).toEqual(mockQuery);
    });

    it('should return null when not found', async () => {
      mockEntityManager.findOne.mockResolvedValue(null);

      const result = await QueryRepository.findById('invalid-id');

      expect(result).toBeNull();
    });
  });

  describe('isManagerOfPod', () => {
    it('should return true when manager owns pod', async () => {
      const mockPod = { id: 'pod-a', manager: 'manager-1' };
      mockEntityManager.findOne.mockResolvedValue(mockPod);

      const result = await QueryRepository.isManagerOfPod('manager-1', 'pod-a');

      expect(mockEntityManager.findOne).toHaveBeenCalledWith(
        expect.any(Function),
        { id: 'pod-a', manager: 'manager-1' }
      );
      expect(result).toBe(true);
    });

    it('should return false when manager does not own pod', async () => {
      mockEntityManager.findOne.mockResolvedValue(null);

      const result = await QueryRepository.isManagerOfPod('manager-1', 'pod-b');

      expect(result).toBe(false);
    });
  });

  describe('reject', () => {
    it('should update query status to REJECTED', async () => {
      const mockQuery: any = { id: 'query-1', status: 'PENDING' };
      const mockManager = { id: 'manager-1' };
      mockEntityManager.findOneOrFail
        .mockResolvedValueOnce(mockQuery)
        .mockResolvedValueOnce(mockManager);
      mockEntityManager.flush.mockResolvedValue(undefined);

      const result = await QueryRepository.reject('query-1', 'manager-1', 'Not approved');

      expect(mockEntityManager.findOneOrFail).toHaveBeenCalledTimes(2);
      expect(mockEntityManager.flush).toHaveBeenCalled();
      expect(mockQuery.status).toBe('REJECTED');
      expect(mockQuery.rejectionReason).toBe('Not approved');
    });

    it('should handle rejection without reason', async () => {
      const mockQuery: any = { id: 'query-1', status: 'PENDING' };
      const mockManager = { id: 'manager-1' };
      mockEntityManager.findOneOrFail
        .mockResolvedValueOnce(mockQuery)
        .mockResolvedValueOnce(mockManager);
      mockEntityManager.flush.mockResolvedValue(undefined);

      await QueryRepository.reject('query-1', 'manager-1');

      expect(mockQuery.rejectionReason).toBeUndefined();
    });
  });

  describe('create', () => {
    it('should create a new query request', async () => {
      const mockRequester = { id: 'user-1' };
      const mockInstance = { id: 'inst-1' };
      const mockPod = { id: 'pod-a' };
      mockEntityManager.findOneOrFail
        .mockResolvedValueOnce(mockRequester)
        .mockResolvedValueOnce(mockInstance)
        .mockResolvedValueOnce(mockPod);
      mockEntityManager.persistAndFlush.mockResolvedValue(undefined);

      const result = await QueryRepository.create({
        requesterId: 'user-1',
        instanceId: 'inst-1',
        databaseName: 'test_db',
        queryText: 'SELECT * FROM users',
        podId: 'pod-a',
        comments: 'Test query',
        submissionType: 'QUERY'
      });

      expect(mockEntityManager.findOneOrFail).toHaveBeenCalledTimes(3);
      expect(mockEntityManager.persistAndFlush).toHaveBeenCalled();
      expect(result.status).toBe('PENDING');
    });

    it('should create script submission with scriptPath', async () => {
      const mockRequester = { id: 'user-1' };
      const mockInstance = { id: 'inst-1' };
      const mockPod = { id: 'pod-a' };
      mockEntityManager.findOneOrFail
        .mockResolvedValueOnce(mockRequester)
        .mockResolvedValueOnce(mockInstance)
        .mockResolvedValueOnce(mockPod);
      mockEntityManager.persistAndFlush.mockResolvedValue(undefined);

      const result = await QueryRepository.create({
        requesterId: 'user-1',
        instanceId: 'inst-1',
        databaseName: 'test_db',
        queryText: '',
        podId: 'pod-a',
        comments: 'Test script',
        submissionType: 'SCRIPT',
        scriptPath: '/uploads/script.js'
      });

      expect(result.scriptPath).toBe('/uploads/script.js');
      expect(result.submissionType).toBe('SCRIPT');
    });

    it('should use default query text for script submission', async () => {
      const mockRequester = { id: 'user-1' };
      const mockInstance = { id: 'inst-1' };
      const mockPod = { id: 'pod-a' };
      mockEntityManager.findOneOrFail
        .mockResolvedValueOnce(mockRequester)
        .mockResolvedValueOnce(mockInstance)
        .mockResolvedValueOnce(mockPod);
      mockEntityManager.persistAndFlush.mockResolvedValue(undefined);

      const result = await QueryRepository.create({
        requesterId: 'user-1',
        instanceId: 'inst-1',
        databaseName: 'test_db',
        queryText: '',
        podId: 'pod-a',
        comments: 'Test',
        submissionType: 'SCRIPT'
      });

      expect(result.queryText).toBe('[SCRIPT SUBMISSION]');
    });
  });

  describe('findByRequesterWithStatus', () => {
    it('should return queries for user without filter', async () => {
      const mockQueries = [{ id: 'q1' }, { id: 'q2' }];
      mockEntityManager.find.mockResolvedValue(mockQueries);

      const result = await QueryRepository.findByRequesterWithStatus('user-1');

      expect(mockEntityManager.find).toHaveBeenCalledWith(
        expect.any(Function),
        { requester: 'user-1' },
        expect.objectContaining({
          populate: ['requester', 'pod', 'instance', 'approvedBy'],
          orderBy: { createdAt: 'DESC' }
        })
      );
      expect(result).toEqual(mockQueries);
    });

    it('should return queries with status filter', async () => {
      const mockQueries = [{ id: 'q1', status: 'PENDING' }];
      mockEntityManager.find.mockResolvedValue(mockQueries);

      const result = await QueryRepository.findByRequesterWithStatus('user-1', ['PENDING', 'APPROVED']);

      expect(mockEntityManager.find).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          requester: 'user-1',
          status: { $in: ['PENDING', 'APPROVED'] }
        }),
        expect.any(Object)
      );
      expect(result).toEqual(mockQueries);
    });

    it('should not add filter for empty status array', async () => {
      mockEntityManager.find.mockResolvedValue([]);

      await QueryRepository.findByRequesterWithStatus('user-1', []);

      expect(mockEntityManager.find).toHaveBeenCalledWith(
        expect.any(Function),
        { requester: 'user-1' },
        expect.any(Object)
      );
    });

    it('should filter by type', async () => {
      mockEntityManager.find.mockResolvedValue([]);

      await QueryRepository.findByRequesterWithStatus('user-1', undefined, 'POSTGRES');

      expect(mockEntityManager.find).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          requester: 'user-1',
          instance: { type: 'POSTGRES' }
        }),
        expect.any(Object)
      );
    });

    it('should filter by both status and type', async () => {
      mockEntityManager.find.mockResolvedValue([]);

      await QueryRepository.findByRequesterWithStatus('user-1', ['PENDING'], 'MONGODB');

      expect(mockEntityManager.find).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          requester: 'user-1',
          status: { $in: ['PENDING'] },
          instance: { type: 'MONGODB' }
        }),
        expect.any(Object)
      );
    });
  });

  describe('countByRequester', () => {
    it('should count queries for user', async () => {
      mockEntityManager.count.mockResolvedValue(5);

      const result = await QueryRepository.countByRequester('user-1');

      expect(mockEntityManager.count).toHaveBeenCalledWith(
        expect.any(Function),
        { requester: 'user-1' }
      );
      expect(result).toBe(5);
    });

    it('should count with filters', async () => {
      mockEntityManager.count.mockResolvedValue(2);

      const result = await QueryRepository.countByRequester('user-1', ['PENDING'], 'POSTGRES');

      expect(mockEntityManager.count).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          requester: 'user-1',
          status: { $in: ['PENDING'] },
          instance: { type: 'POSTGRES' }
        })
      );
      expect(result).toBe(2);
    });
  });

  describe('findByManagerWithStatus', () => {
    it('should return queries for manager pods', async () => {
      const mockQueries = [{ id: 'q1' }];
      mockEntityManager.find.mockResolvedValue(mockQueries);

      const result = await QueryRepository.findByManagerWithStatus('manager-1');

      expect(mockEntityManager.find).toHaveBeenCalledWith(
        expect.any(Function),
        { pod: { manager: 'manager-1' } },
        expect.any(Object)
      );
      expect(result).toEqual(mockQueries);
    });

    it('should filter by status', async () => {
      mockEntityManager.find.mockResolvedValue([]);

      await QueryRepository.findByManagerWithStatus('manager-1', ['PENDING']);

      expect(mockEntityManager.find).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          pod: { manager: 'manager-1' },
          status: { $in: ['PENDING'] }
        }),
        expect.any(Object)
      );
    });

    it('should filter by type', async () => {
      mockEntityManager.find.mockResolvedValue([]);

      await QueryRepository.findByManagerWithStatus('manager-1', undefined, 'POSTGRES');

      expect(mockEntityManager.find).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          pod: { manager: 'manager-1' },
          instance: { type: 'POSTGRES' }
        }),
        expect.any(Object)
      );
    });

    it('should filter by both status and type', async () => {
      mockEntityManager.find.mockResolvedValue([]);

      await QueryRepository.findByManagerWithStatus('manager-1', ['PENDING'], 'MONGODB');

      expect(mockEntityManager.find).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          pod: { manager: 'manager-1' },
          status: { $in: ['PENDING'] },
          instance: { type: 'MONGODB' }
        }),
        expect.any(Object)
      );
    });
  });

  describe('countByManager', () => {
    it('should count queries for manager', async () => {
      mockEntityManager.count.mockResolvedValue(10);

      const result = await QueryRepository.countByManager('manager-1');

      expect(mockEntityManager.count).toHaveBeenCalledWith(
        expect.any(Function),
        { pod: { manager: 'manager-1' } }
      );
      expect(result).toBe(10);
    });
  });

  describe('findAllWithStatus', () => {
    it('should return all queries without filter', async () => {
      const mockQueries = [{ id: 'q1' }, { id: 'q2' }];
      mockEntityManager.find.mockResolvedValue(mockQueries);

      const result = await QueryRepository.findAllWithStatus();

      expect(mockEntityManager.find).toHaveBeenCalledWith(
        expect.any(Function),
        {},
        expect.any(Object)
      );
      expect(result).toEqual(mockQueries);
    });

    it('should filter by status', async () => {
      mockEntityManager.find.mockResolvedValue([]);

      await QueryRepository.findAllWithStatus(['EXECUTED', 'FAILED']);

      expect(mockEntityManager.find).toHaveBeenCalledWith(
        expect.any(Function),
        { status: { $in: ['EXECUTED', 'FAILED'] } },
        expect.any(Object)
      );
    });

    it('should filter by type', async () => {
      mockEntityManager.find.mockResolvedValue([]);

      await QueryRepository.findAllWithStatus(undefined, 'MONGODB');

      expect(mockEntityManager.find).toHaveBeenCalledWith(
        expect.any(Function),
        { instance: { type: 'MONGODB' } },
        expect.any(Object)
      );
    });

    it('should filter by both status and type', async () => {
      mockEntityManager.find.mockResolvedValue([]);

      await QueryRepository.findAllWithStatus(['PENDING'], 'POSTGRES');

      expect(mockEntityManager.find).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          status: { $in: ['PENDING'] },
          instance: { type: 'POSTGRES' }
        }),
        expect.any(Object)
      );
    });
  });

  describe('countAll', () => {
    it('should count all queries', async () => {
      mockEntityManager.count.mockResolvedValue(100);

      const result = await QueryRepository.countAll();

      expect(mockEntityManager.count).toHaveBeenCalledWith(
        expect.any(Function),
        {}
      );
      expect(result).toBe(100);
    });
  });

  describe('markExecuted', () => {
    it('should update query to EXECUTED status', async () => {
      const mockQuery: any = { id: 'query-1', status: 'PENDING' };
      const mockManager = { id: 'manager-1' };
      mockEntityManager.findOneOrFail
        .mockResolvedValueOnce(mockQuery)
        .mockResolvedValueOnce(mockManager);
      mockEntityManager.flush.mockResolvedValue(undefined);

      await QueryRepository.markExecuted('query-1', 'manager-1', { rows: [{ id: 1 }] });

      expect(mockQuery.status).toBe('EXECUTED');
      expect(mockQuery.executionResult).toEqual({ rows: [{ id: 1 }] });
      expect(mockEntityManager.flush).toHaveBeenCalled();
    });
  });

  describe('markFailed', () => {
    it('should update query to FAILED status', async () => {
      const mockQuery: any = { id: 'query-1', status: 'PENDING' };
      const mockManager = { id: 'manager-1' };
      mockEntityManager.findOneOrFail
        .mockResolvedValueOnce(mockQuery)
        .mockResolvedValueOnce(mockManager);
      mockEntityManager.flush.mockResolvedValue(undefined);

      await QueryRepository.markFailed('query-1', 'manager-1', 'Connection timeout');

      expect(mockQuery.status).toBe('FAILED');
      expect(mockQuery.executionResult).toEqual({ error: 'Connection timeout' });
      expect(mockEntityManager.flush).toHaveBeenCalled();
    });
  });
});
