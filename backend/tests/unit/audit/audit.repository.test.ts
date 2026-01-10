import { AuditRepository } from '../../../src/modules/audit/audit.repository';
import { pool } from '../../../src/config/db';

jest.mock('../../../src/config/db', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('AuditRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('log', () => {
    it('should insert audit log entry', async () => {
      const mockResult = { rows: [{ id: 'log-1', action: 'SUBMITTED' }] };
      (pool.query as jest.Mock).mockResolvedValue(mockResult);

      const result = await AuditRepository.log({
        queryRequestId: 'query-1',
        action: 'SUBMITTED',
        performedBy: 'user-1',
        details: { podId: 'pod-a' }
      });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO query_audit_log'),
        ['query-1', 'SUBMITTED', 'user-1', '{"podId":"pod-a"}']
      );
      expect(result).toEqual(mockResult.rows[0]);
    });

    it('should insert audit log without details', async () => {
      const mockResult = { rows: [{ id: 'log-1' }] };
      (pool.query as jest.Mock).mockResolvedValue(mockResult);

      await AuditRepository.log({
        queryRequestId: 'query-1',
        action: 'APPROVED',
        performedBy: 'manager-1'
      });

      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['query-1', 'APPROVED', 'manager-1', '{}']
      );
    });
  });

  describe('findByQueryId', () => {
    it('should return audit logs for a query', async () => {
      const mockLogs = [
        { id: 'log-1', action: 'SUBMITTED', performed_by_name: 'User 1' },
        { id: 'log-2', action: 'EXECUTED', performed_by_name: 'Manager 1' }
      ];
      (pool.query as jest.Mock).mockResolvedValue({ rows: mockLogs });

      const result = await AuditRepository.findByQueryId('query-1');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE qal.query_request_id = $1'),
        ['query-1']
      );
      expect(result).toEqual(mockLogs);
    });
  });

  describe('findByUserId', () => {
    it('should return audit logs for a specific user', async () => {
      const mockLogs = [
        { id: 'log-1', action: 'SUBMITTED', performed_by: 'user-1', performed_by_name: 'User One' },
        { id: 'log-2', action: 'APPROVED', performed_by: 'user-1', performed_by_name: 'User One' }
      ];
      (pool.query as jest.Mock).mockResolvedValue({ rows: mockLogs });

      const result = await AuditRepository.findByUserId('user-1');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE qal.performed_by = $1'),
        ['user-1', 100, 0]
      );
      expect(result).toEqual(mockLogs);
    });

    it('should return audit logs with custom pagination', async () => {
      const mockLogs = [{ id: 'log-1' }];
      (pool.query as jest.Mock).mockResolvedValue({ rows: mockLogs });

      const result = await AuditRepository.findByUserId('user-1', 50, 10);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        ['user-1', 50, 10]
      );
      expect(result).toEqual(mockLogs);
    });
  });

  describe('findAll', () => {
    it('should return all audit logs with pagination', async () => {
      const mockLogs = [{ id: 'log-1' }, { id: 'log-2' }];
      (pool.query as jest.Mock).mockResolvedValue({ rows: mockLogs });

      const result = await AuditRepository.findAll(50, 10);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1 OFFSET $2'),
        [50, 10]
      );
      expect(result).toEqual(mockLogs);
    });

    it('should use default pagination values', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await AuditRepository.findAll();

      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        [100, 0]
      );
    });
  });
});
