import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/app';
import { UserRepository } from '../../src/modules/users/user.repository';

// Mock UserRepository
jest.mock('../../src/modules/users/user.repository');
const mockUserRepository = UserRepository as jest.Mocked<typeof UserRepository>;

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

describe('Audit Access Control', () => {
  let adminToken: string;
  let managerToken: string;
  let developerToken: string;

  beforeAll(() => {
    // Create tokens for different roles
    adminToken = jwt.sign({ userId: 'admin-user-id', role: 'ADMIN' }, JWT_SECRET);
    managerToken = jwt.sign({ userId: 'manager-user-id', role: 'MANAGER' }, JWT_SECRET);
    developerToken = jwt.sign({ userId: 'developer-user-id', role: 'DEVELOPER' }, JWT_SECRET);
  });

  beforeEach(() => {
    // Mock user lookup to return users with appropriate roles
    mockUserRepository.findById.mockImplementation((id: string) => {
      if (id === 'admin-user-id') {
        return Promise.resolve({
          id: 'admin-user-id',
          email: 'admin@test.com',
          name: 'Admin User',
          role: 'ADMIN',
          passwordHash: 'hash'
        } as any);
      }
      if (id === 'manager-user-id') {
        return Promise.resolve({
          id: 'manager-user-id',
          email: 'manager@test.com',
          name: 'Manager User',
          role: 'MANAGER',
          passwordHash: 'hash'
        } as any);
      }
      if (id === 'developer-user-id') {
        return Promise.resolve({
          id: 'developer-user-id',
          email: 'developer@test.com',
          name: 'Developer User',
          role: 'DEVELOPER',
          passwordHash: 'hash'
        } as any);
      }
      return Promise.resolve(null);
    });
  });

  describe('GET /api/audit', () => {
    it('should allow ADMIN access', async () => {
      const response = await request(app)
        .get('/api/audit')
        .set('Authorization', `Bearer ${adminToken}`);

      // Should not return 403 (might return other errors due to missing DB setup)
      expect(response.status).not.toBe(403);
    });

    it('should deny DEVELOPER access with 403', async () => {
      const response = await request(app)
        .get('/api/audit')
        .set('Authorization', `Bearer ${developerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Access denied');
    });

    it('should deny MANAGER access with 403', async () => {
      const response = await request(app)
        .get('/api/audit')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Access denied');
    });

    it('should deny access without token', async () => {
      const response = await request(app)
        .get('/api/audit');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/audit/query/:queryId', () => {
    const testQueryId = 'test-query-id';

    it('should allow ADMIN access', async () => {
      const response = await request(app)
        .get(`/api/audit/query/${testQueryId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Should not return 403 (might return other errors due to missing DB setup)
      expect(response.status).not.toBe(403);
    });

    it('should deny DEVELOPER access with 403', async () => {
      const response = await request(app)
        .get(`/api/audit/query/${testQueryId}`)
        .set('Authorization', `Bearer ${developerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Access denied');
    });

    it('should deny MANAGER access with 403', async () => {
      const response = await request(app)
        .get(`/api/audit/query/${testQueryId}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Access denied');
    });
  });
});