import {
  loginSchema,
  refreshSchema,
  logoutSchema,
  submitQuerySchema,
  queryIdParamSchema,
  getQueriesSchema,
  listDatabasesSchema,
  listInstancesSchema,
  podIdParamSchema,
  getAuditLogsSchema,
  auditQueryIdParamSchema,
} from '../../../src/validation/schemas';

describe('Validation Schemas', () => {
  describe('Auth Schemas', () => {
    describe('loginSchema', () => {
      it('should pass with valid email and password', () => {
        const result = loginSchema.safeParse({
          body: { email: 'test@example.com', password: 'password123' },
        });
        expect(result.success).toBe(true);
      });

      it('should fail with invalid email', () => {
        const result = loginSchema.safeParse({
          body: { email: 'invalid', password: 'password123' },
        });
        expect(result.success).toBe(false);
      });

      it('should fail with empty password', () => {
        const result = loginSchema.safeParse({
          body: { email: 'test@example.com', password: '' },
        });
        expect(result.success).toBe(false);
      });

      it('should fail with missing fields', () => {
        const result = loginSchema.safeParse({ body: {} });
        expect(result.success).toBe(false);
      });
    });

    describe('refreshSchema', () => {
      it('should pass with valid refresh token', () => {
        const result = refreshSchema.safeParse({
          body: { refreshToken: 'some-token-value' },
        });
        expect(result.success).toBe(true);
      });

      it('should fail with empty refresh token', () => {
        const result = refreshSchema.safeParse({
          body: { refreshToken: '' },
        });
        expect(result.success).toBe(false);
      });
    });

    describe('logoutSchema', () => {
      it('should pass with valid refresh token', () => {
        const result = logoutSchema.safeParse({
          body: { refreshToken: 'some-token-value' },
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Query Schemas', () => {
    describe('submitQuerySchema', () => {
      const validBody = {
        instanceId: '550e8400-e29b-41d4-a716-446655440000',
        databaseName: 'testdb',
        podId: '550e8400-e29b-41d4-a716-446655440001',
        comments: 'Valid test comment',
        submissionType: 'QUERY' as const,
      };

      it('should pass with valid QUERY submission', () => {
        const result = submitQuerySchema.safeParse({ 
          body: { ...validBody, queryText: 'SELECT * FROM users' } 
        });
        expect(result.success).toBe(true);
      });

      it('should pass with valid SCRIPT submission', () => {
        const result = submitQuerySchema.safeParse({
          body: { ...validBody, submissionType: 'SCRIPT' },
        });
        expect(result.success).toBe(true);
      });

      it('should pass with optional fields', () => {
        const result = submitQuerySchema.safeParse({
          body: { ...validBody, queryText: 'SELECT 1', comments: 'Test query' },
        });
        expect(result.success).toBe(true);
      });

      it('should fail with invalid instanceId', () => {
        const result = submitQuerySchema.safeParse({
          body: { ...validBody, instanceId: 'not-a-uuid' },
        });
        expect(result.success).toBe(false);
      });

      it('should fail with invalid submissionType', () => {
        const result = submitQuerySchema.safeParse({
          body: { ...validBody, submissionType: 'INVALID' },
        });
        expect(result.success).toBe(false);
      });

      it('should fail with empty databaseName', () => {
        const result = submitQuerySchema.safeParse({
          body: { ...validBody, databaseName: '' },
        });
        expect(result.success).toBe(false);
      });

      it('should fail with whitespace-only databaseName', () => {
        const result = submitQuerySchema.safeParse({
          body: { ...validBody, databaseName: '   ' },
        });
        expect(result.success).toBe(false);
      });

      it('should fail with empty podId', () => {
        const result = submitQuerySchema.safeParse({
          body: { ...validBody, podId: '' },
        });
        expect(result.success).toBe(false);
      });

      it('should fail with whitespace-only podId', () => {
        const result = submitQuerySchema.safeParse({
          body: { ...validBody, podId: '   ' },
        });
        expect(result.success).toBe(false);
      });

      it('should fail with empty comments', () => {
        const result = submitQuerySchema.safeParse({
          body: { ...validBody, comments: '' },
        });
        expect(result.success).toBe(false);
      });

      it('should fail with whitespace-only comments', () => {
        const result = submitQuerySchema.safeParse({
          body: { ...validBody, comments: '   ' },
        });
        expect(result.success).toBe(false);
      });

      it('should fail QUERY submission without queryText', () => {
        const result = submitQuerySchema.safeParse({
          body: { ...validBody, submissionType: 'QUERY', comments: 'Valid comment' },
        });
        expect(result.success).toBe(false);
      });

      it('should fail QUERY submission with empty queryText', () => {
        const result = submitQuerySchema.safeParse({
          body: { ...validBody, submissionType: 'QUERY', queryText: '', comments: 'Valid comment' },
        });
        expect(result.success).toBe(false);
      });

      it('should fail QUERY submission with whitespace-only queryText', () => {
        const result = submitQuerySchema.safeParse({
          body: { ...validBody, submissionType: 'QUERY', queryText: '   ', comments: 'Valid comment' },
        });
        expect(result.success).toBe(false);
      });

      it('should pass QUERY submission with valid queryText and comments', () => {
        const result = submitQuerySchema.safeParse({
          body: { ...validBody, submissionType: 'QUERY', queryText: 'SELECT * FROM users', comments: 'Valid comment' },
        });
        expect(result.success).toBe(true);
      });

      it('should pass SCRIPT submission without queryText', () => {
        const result = submitQuerySchema.safeParse({
          body: { ...validBody, submissionType: 'SCRIPT', comments: 'Valid comment' },
        });
        expect(result.success).toBe(true);
      });
    });

    describe('queryIdParamSchema', () => {
      it('should pass with valid UUID', () => {
        const result = queryIdParamSchema.safeParse({
          params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        });
        expect(result.success).toBe(true);
      });

      it('should fail with invalid UUID', () => {
        const result = queryIdParamSchema.safeParse({
          params: { id: 'not-a-uuid' },
        });
        expect(result.success).toBe(false);
      });
    });

    describe('getQueriesSchema', () => {
      it('should pass with no query params', () => {
        const result = getQueriesSchema.safeParse({ query: {} });
        expect(result.success).toBe(true);
      });

      it('should pass with valid query params', () => {
        const result = getQueriesSchema.safeParse({
          query: { status: 'PENDING', type: 'QUERY', limit: '10', offset: '0' },
        });
        expect(result.success).toBe(true);
      });

      it('should fail with non-numeric limit', () => {
        const result = getQueriesSchema.safeParse({
          query: { limit: 'abc' },
        });
        expect(result.success).toBe(false);
      });

      it('should fail with invalid type', () => {
        const result = getQueriesSchema.safeParse({
          query: { type: 'INVALID' },
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Database Schemas', () => {
    describe('listDatabasesSchema', () => {
      it('should pass with valid instanceId', () => {
        const result = listDatabasesSchema.safeParse({
          query: { instanceId: '550e8400-e29b-41d4-a716-446655440000' },
        });
        expect(result.success).toBe(true);
      });

      it('should fail with invalid instanceId', () => {
        const result = listDatabasesSchema.safeParse({
          query: { instanceId: 'not-a-uuid' },
        });
        expect(result.success).toBe(false);
      });

      it('should fail with missing instanceId', () => {
        const result = listDatabasesSchema.safeParse({ query: {} });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Instance Schemas', () => {
    describe('listInstancesSchema', () => {
      it('should pass with no type', () => {
        const result = listInstancesSchema.safeParse({ query: {} });
        expect(result.success).toBe(true);
      });

      it('should pass with POSTGRES type', () => {
        const result = listInstancesSchema.safeParse({
          query: { type: 'POSTGRES' },
        });
        expect(result.success).toBe(true);
      });

      it('should pass with MONGODB type', () => {
        const result = listInstancesSchema.safeParse({
          query: { type: 'MONGODB' },
        });
        expect(result.success).toBe(true);
      });

      it('should fail with invalid type', () => {
        const result = listInstancesSchema.safeParse({
          query: { type: 'MYSQL' },
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Pod Schemas', () => {
    describe('podIdParamSchema', () => {
      it('should pass with valid pod ID', () => {
        const result = podIdParamSchema.safeParse({
          params: { id: 'pod-a' },
        });
        expect(result.success).toBe(true);
      });

      it('should pass with UUID pod ID', () => {
        const result = podIdParamSchema.safeParse({
          params: { id: '550e8400-e29b-41d4-a716-446655440000' },
        });
        expect(result.success).toBe(true);
      });

      it('should fail with empty pod ID', () => {
        const result = podIdParamSchema.safeParse({
          params: { id: '' },
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Audit Schemas', () => {
    describe('getAuditLogsSchema', () => {
      it('should pass with no query params', () => {
        const result = getAuditLogsSchema.safeParse({ query: {} });
        expect(result.success).toBe(true);
      });

      it('should pass with valid query params', () => {
        const result = getAuditLogsSchema.safeParse({
          query: {
            limit: '50',
            offset: '10',
            queryId: '550e8400-e29b-41d4-a716-446655440000',
            instanceId: '550e8400-e29b-41d4-a716-446655440001',
          },
        });
        expect(result.success).toBe(true);
      });

      it('should fail with invalid instanceId', () => {
        const result = getAuditLogsSchema.safeParse({
          query: { instanceId: 'not-a-uuid' },
        });
        expect(result.success).toBe(false);
      });

      it('should fail with invalid queryId', () => {
        const result = getAuditLogsSchema.safeParse({
          query: { queryId: 'not-a-uuid' },
        });
        expect(result.success).toBe(false);
      });

      it('should fail with non-numeric limit', () => {
        const result = getAuditLogsSchema.safeParse({
          query: { limit: 'abc' },
        });
        expect(result.success).toBe(false);
      });
    });

    describe('auditQueryIdParamSchema', () => {
      it('should pass with valid UUID', () => {
        const result = auditQueryIdParamSchema.safeParse({
          params: { queryId: '550e8400-e29b-41d4-a716-446655440000' },
        });
        expect(result.success).toBe(true);
      });

      it('should fail with invalid UUID', () => {
        const result = auditQueryIdParamSchema.safeParse({
          params: { queryId: 'invalid' },
        });
        expect(result.success).toBe(false);
      });
    });
  });
});
