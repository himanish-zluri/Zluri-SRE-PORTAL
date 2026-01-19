import { submitQuerySchema, validateScriptSize, MAX_QUERY_SIZE, MAX_SCRIPT_SIZE, MAX_COMMENTS_SIZE } from '../../validation/schemas/query.schema';

describe('Input Size Limits', () => {
  describe('Query Text Limits', () => {
    it('should accept query text within limit', () => {
      const validQuery = 'SELECT * FROM users';
      const result = submitQuerySchema.safeParse({
        body: {
          instanceId: '550e8400-e29b-41d4-a716-446655440000',
          databaseName: 'test_db',
          queryText: validQuery,
          podId: 'pod-1',
          comments: 'Test query',
          submissionType: 'QUERY'
        }
      });
      
      expect(result.success).toBe(true);
    });

    it('should reject query text exceeding limit', () => {
      const oversizedQuery = 'SELECT * FROM users WHERE id = 1 ' + 'x'.repeat(MAX_QUERY_SIZE);
      const result = submitQuerySchema.safeParse({
        body: {
          instanceId: '550e8400-e29b-41d4-a716-446655440000',
          databaseName: 'test_db',
          queryText: oversizedQuery,
          podId: 'pod-1',
          comments: 'Test query',
          submissionType: 'QUERY'
        }
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain(`cannot exceed ${MAX_QUERY_SIZE} characters`);
    });
  });

  describe('Comments Limits', () => {
    it('should accept comments within limit', () => {
      const validComments = 'This is a test query for user data';
      const result = submitQuerySchema.safeParse({
        body: {
          instanceId: '550e8400-e29b-41d4-a716-446655440000',
          databaseName: 'test_db',
          queryText: 'SELECT * FROM users',
          podId: 'pod-1',
          comments: validComments,
          submissionType: 'QUERY'
        }
      });
      
      expect(result.success).toBe(true);
    });

    it('should reject comments exceeding limit', () => {
      const oversizedComments = 'x'.repeat(MAX_COMMENTS_SIZE + 1);
      const result = submitQuerySchema.safeParse({
        body: {
          instanceId: '550e8400-e29b-41d4-a716-446655440000',
          databaseName: 'test_db',
          queryText: 'SELECT * FROM users',
          podId: 'pod-1',
          comments: oversizedComments,
          submissionType: 'QUERY'
        }
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain(`cannot exceed ${MAX_COMMENTS_SIZE} characters`);
    });
  });

  describe('Script Size Validation', () => {
    it('should accept script content within limit', () => {
      const validScript = 'console.log("Hello world");';
      expect(validateScriptSize(validScript)).toBe(true);
    });

    it('should reject script content exceeding limit', () => {
      const oversizedScript = 'console.log("test"); '.repeat(MAX_SCRIPT_SIZE / 10);
      expect(validateScriptSize(oversizedScript)).toBe(false);
    });

    it('should handle edge case at exact limit', () => {
      const exactLimitScript = 'x'.repeat(MAX_SCRIPT_SIZE);
      expect(validateScriptSize(exactLimitScript)).toBe(true);
      
      const overLimitScript = 'x'.repeat(MAX_SCRIPT_SIZE + 1);
      expect(validateScriptSize(overLimitScript)).toBe(false);
    });
  });

  describe('Database Name and Pod ID Limits', () => {
    it('should reject oversized database name', () => {
      const oversizedDbName = 'x'.repeat(101); // Over 100 char limit
      const result = submitQuerySchema.safeParse({
        body: {
          instanceId: '550e8400-e29b-41d4-a716-446655440000',
          databaseName: oversizedDbName,
          queryText: 'SELECT * FROM users',
          podId: 'pod-1',
          comments: 'Test',
          submissionType: 'QUERY'
        }
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain('cannot exceed 100 characters');
    });

    it('should reject oversized pod ID', () => {
      const oversizedPodId = 'x'.repeat(51); // Over 50 char limit
      const result = submitQuerySchema.safeParse({
        body: {
          instanceId: '550e8400-e29b-41d4-a716-446655440000',
          databaseName: 'test_db',
          queryText: 'SELECT * FROM users',
          podId: oversizedPodId,
          comments: 'Test',
          submissionType: 'QUERY'
        }
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain('cannot exceed 50 characters');
    });
  });
});