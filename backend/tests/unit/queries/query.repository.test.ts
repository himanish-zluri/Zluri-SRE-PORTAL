import { QueryRepository } from '../../../src/modules/queries/query.repository';
import { pool } from '../../../src/config/db';

jest.mock('../../../src/config/db', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('QueryRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return query when found', async () => {
      const mockQuery = { id: 'query-1', status: 'PENDING' };
      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockQuery] });

      const result = await QueryRepository.findById('query-1');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM query_requests WHERE id = $1'),
        ['query-1']
      );
      expect(result).toEqual(mockQuery);
    });

    it('should return null when not found', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await QueryRepository.findById('invalid-id');

      expect(result).toBeNull();
    });
  });

  describe('isManagerOfPod', () => {
    it('should return true when manager owns pod', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      const result = await QueryRepository.isManagerOfPod('manager-1', 'pod-a');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT 1 FROM pods WHERE id = $1 AND manager_id = $2'),
        ['pod-a', 'manager-1']
      );
      expect(result).toBe(true);
    });

    it('should return false when manager does not own pod', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rowCount: 0 });

      const result = await QueryRepository.isManagerOfPod('manager-1', 'pod-b');

      expect(result).toBe(false);
    });

    it('should return false when rowCount is null', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rowCount: null });

      const result = await QueryRepository.isManagerOfPod('manager-1', 'pod-b');

      expect(result).toBe(false);
    });
  });

  describe('reject', () => {
    it('should update query status to REJECTED', async () => {
      const mockResult = { id: 'query-1', status: 'REJECTED' };
      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockResult] });

      const result = await QueryRepository.reject('query-1', 'manager-1', 'Not approved');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("SET status = 'REJECTED'"),
        ['manager-1', 'Not approved', 'query-1']
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle rejection without reason', async () => {
      const mockResult = { id: 'query-1', status: 'REJECTED' };
      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockResult] });

      await QueryRepository.reject('query-1', 'manager-1');

      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['manager-1', null, 'query-1']
      );
    });
  });

  describe('create', () => {
    it('should create a new query request', async () => {
      const mockCreated = { id: 'query-1', status: 'PENDING' };
      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockCreated] });

      const result = await QueryRepository.create({
        requesterId: 'user-1',
        instanceId: 'inst-1',
        databaseName: 'test_db',
        queryText: 'SELECT * FROM users',
        podId: 'pod-a',
        comments: 'Test query',
        submissionType: 'QUERY'
      });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO query_requests'),
        expect.arrayContaining(['user-1', 'inst-1', 'test_db'])
      );
      expect(result).toEqual(mockCreated);
    });

    it('should create script submission with scriptPath', async () => {
      const mockCreated = { id: 'query-1', status: 'PENDING' };
      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockCreated] });

      await QueryRepository.create({
        requesterId: 'user-1',
        instanceId: 'inst-1',
        databaseName: 'test_db',
        queryText: '',
        podId: 'pod-a',
        comments: 'Test script',
        submissionType: 'SCRIPT',
        scriptPath: '/uploads/script.js'
      });

      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['/uploads/script.js'])
      );
    });

    it('should use default query text for script submission', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [{}] });

      await QueryRepository.create({
        requesterId: 'user-1',
        instanceId: 'inst-1',
        databaseName: 'test_db',
        queryText: '',
        podId: 'pod-a',
        comments: 'Test',
        submissionType: 'SCRIPT'
      });

      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['[SCRIPT SUBMISSION]'])
      );
    });
  });

  describe('findByRequesterWithStatus', () => {
    it('should return queries for user without filter', async () => {
      const mockQueries = [{ id: 'q1' }, { id: 'q2' }];
      (pool.query as jest.Mock).mockResolvedValue({ rows: mockQueries });

      const result = await QueryRepository.findByRequesterWithStatus('user-1');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE requester_id = $1'),
        ['user-1']
      );
      expect(result).toEqual(mockQueries);
    });

    it('should return queries with status filter', async () => {
      const mockQueries = [{ id: 'q1', status: 'PENDING' }];
      (pool.query as jest.Mock).mockResolvedValue({ rows: mockQueries });

      const result = await QueryRepository.findByRequesterWithStatus('user-1', ['PENDING', 'APPROVED']);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND status = ANY($2)'),
        ['user-1', ['PENDING', 'APPROVED']]
      );
      expect(result).toEqual(mockQueries);
    });

    it('should not add filter for empty status array', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await QueryRepository.findByRequesterWithStatus('user-1', []);

      expect(pool.query).toHaveBeenCalledWith(
        expect.not.stringContaining('AND status = ANY'),
        ['user-1']
      );
    });
  });

  describe('findByManagerWithStatus', () => {
    it('should return queries for manager pods', async () => {
      const mockQueries = [{ id: 'q1' }];
      (pool.query as jest.Mock).mockResolvedValue({ rows: mockQueries });

      const result = await QueryRepository.findByManagerWithStatus('manager-1');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE p.manager_id = $1'),
        ['manager-1']
      );
      expect(result).toEqual(mockQueries);
    });

    it('should filter by status', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await QueryRepository.findByManagerWithStatus('manager-1', ['PENDING']);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND qr.status = ANY($2)'),
        ['manager-1', ['PENDING']]
      );
    });
  });

  describe('findAllWithStatus', () => {
    it('should return all queries without filter', async () => {
      const mockQueries = [{ id: 'q1' }, { id: 'q2' }];
      (pool.query as jest.Mock).mockResolvedValue({ rows: mockQueries });

      const result = await QueryRepository.findAllWithStatus();

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM query_requests'),
        []
      );
      expect(result).toEqual(mockQueries);
    });

    it('should filter by status', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await QueryRepository.findAllWithStatus(['EXECUTED', 'FAILED']);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE status = ANY($1)'),
        [['EXECUTED', 'FAILED']]
      );
    });
  });

  describe('markExecuted', () => {
    it('should update query to EXECUTED status', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await QueryRepository.markExecuted('query-1', 'manager-1', { rows: [{ id: 1 }] });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("SET status = 'EXECUTED'"),
        ['query-1', 'manager-1', expect.any(String)]
      );
    });
  });

  describe('markFailed', () => {
    it('should update query to FAILED status', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await QueryRepository.markFailed('query-1', 'manager-1', 'Connection timeout');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("SET status = 'FAILED'"),
        ['query-1', 'manager-1', expect.stringContaining('Connection timeout')]
      );
    });
  });
});
