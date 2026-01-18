import { submitQuerySchema } from '../../../src/validation/schemas/query.schema';

describe('Multiple Statement Validation', () => {
  const baseValidData = {
    instanceId: '550e8400-e29b-41d4-a716-446655440000',
    databaseName: 'test_db',
    podId: 'pod-1',
    comments: 'Test query',
    submissionType: 'QUERY' as const
  };

  describe('Single Statement Queries - PostgreSQL', () => {
    it('should accept single SELECT statement', () => {
      const result = submitQuerySchema.safeParse({
        body: {
          ...baseValidData,
          queryText: 'SELECT * FROM users'
        }
      });
      
      expect(result.success).toBe(true);
    });

    it('should accept single SELECT statement with trailing semicolon', () => {
      const result = submitQuerySchema.safeParse({
        body: {
          ...baseValidData,
          queryText: 'SELECT * FROM users;'
        }
      });
      
      expect(result.success).toBe(true);
    });

    it('should accept single INSERT statement', () => {
      const result = submitQuerySchema.safeParse({
        body: {
          ...baseValidData,
          queryText: 'INSERT INTO users (name) VALUES (\'John\')'
        }
      });
      
      expect(result.success).toBe(true);
    });

    it('should accept single UPDATE statement', () => {
      const result = submitQuerySchema.safeParse({
        body: {
          ...baseValidData,
          queryText: 'UPDATE users SET name = \'Jane\' WHERE id = 1'
        }
      });
      
      expect(result.success).toBe(true);
    });

    it('should accept single DELETE statement', () => {
      const result = submitQuerySchema.safeParse({
        body: {
          ...baseValidData,
          queryText: 'DELETE FROM users WHERE id = 1'
        }
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('Single Statement Queries - MongoDB', () => {
    it('should accept single MongoDB find query', () => {
      const result = submitQuerySchema.safeParse({
        body: {
          ...baseValidData,
          queryText: 'db.users.find({})'
        }
      });
      
      expect(result.success).toBe(true);
    });

    it('should accept MongoDB query with trailing semicolon', () => {
      const result = submitQuerySchema.safeParse({
        body: {
          ...baseValidData,
          queryText: 'db.users.find({ status: "active" });'
        }
      });
      
      expect(result.success).toBe(true);
    });

    it('should accept MongoDB countDocuments query', () => {
      const result = submitQuerySchema.safeParse({
        body: {
          ...baseValidData,
          queryText: 'db.orders.countDocuments({ status: "pending" })'
        }
      });
      
      expect(result.success).toBe(true);
    });

    it('should accept MongoDB aggregate query', () => {
      const result = submitQuerySchema.safeParse({
        body: {
          ...baseValidData,
          queryText: 'db.users.aggregate([{ $group: { _id: "$department", count: { $sum: 1 } } }])'
        }
      });
      
      expect(result.success).toBe(true);
    });

    it('should accept collection helper syntax', () => {
      const result = submitQuerySchema.safeParse({
        body: {
          ...baseValidData,
          queryText: 'collection("users").find({ age: { $gte: 18 } })'
        }
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('Multiple Statement Queries (Should Reject)', () => {
    it('should reject two PostgreSQL SELECT statements', () => {
      const result = submitQuerySchema.safeParse({
        body: {
          ...baseValidData,
          queryText: 'SELECT * FROM users; SELECT * FROM orders'
        }
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe('Query mode supports single statements only. For multiple queries, use Script mode.');
    });

    it('should reject two MongoDB find queries', () => {
      const result = submitQuerySchema.safeParse({
        body: {
          ...baseValidData,
          queryText: 'db.users.find({}); db.orders.find({})'
        }
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe('Query mode supports single statements only. For multiple queries, use Script mode.');
    });

    it('should reject MongoDB query followed by count', () => {
      const result = submitQuerySchema.safeParse({
        body: {
          ...baseValidData,
          queryText: 'db.users.find({}); db.users.countDocuments({})'
        }
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe('Query mode supports single statements only. For multiple queries, use Script mode.');
    });

    it('should reject mixed PostgreSQL and MongoDB (hypothetical)', () => {
      const result = submitQuerySchema.safeParse({
        body: {
          ...baseValidData,
          queryText: 'SELECT * FROM users; db.logs.insertOne({ message: "test" })'
        }
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe('Query mode supports single statements only. For multiple queries, use Script mode.');
    });

    it('should reject SELECT followed by INSERT', () => {
      const result = submitQuerySchema.safeParse({
        body: {
          ...baseValidData,
          queryText: 'SELECT * FROM users; INSERT INTO logs (message) VALUES (\'test\')'
        }
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe('Query mode supports single statements only. For multiple queries, use Script mode.');
    });

    it('should reject multiple semicolons', () => {
      const result = submitQuerySchema.safeParse({
        body: {
          ...baseValidData,
          queryText: 'db.users.find({});; db.orders.find({});'
        }
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe('Query mode supports single statements only. For multiple queries, use Script mode.');
    });

    it('should reject semicolon in middle of query', () => {
      const result = submitQuerySchema.safeParse({
        body: {
          ...baseValidData,
          queryText: 'db.users.find({}); db.users.countDocuments({})'
        }
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe('Query mode supports single statements only. For multiple queries, use Script mode.');
    });

    it('should reject complex multi-statement MongoDB query', () => {
      const result = submitQuerySchema.safeParse({
        body: {
          ...baseValidData,
          queryText: `
            db.temp_users.insertMany(db.users.find({}));
            db.temp_users.updateMany({}, { $set: { status: 'active' } });
            db.temp_users.find({});
          `
        }
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe('Query mode supports single statements only. For multiple queries, use Script mode.');
    });
  });

  describe('Script Mode (Should Allow Multiple Statements)', () => {
    it('should allow script submissions without queryText validation', () => {
      const result = submitQuerySchema.safeParse({
        body: {
          ...baseValidData,
          submissionType: 'SCRIPT',
          queryText: undefined // Scripts don't use queryText
        }
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle PostgreSQL queries with semicolons in string literals', () => {
      const result = submitQuerySchema.safeParse({
        body: {
          ...baseValidData,
          queryText: 'SELECT \'Hello; World\' as message FROM users'
        }
      });
      
      // This is a limitation - our simple validation will reject this
      // In a production system, you'd want proper SQL parsing
      expect(result.success).toBe(false);
    });

    it('should handle MongoDB queries with semicolons in string literals', () => {
      const result = submitQuerySchema.safeParse({
        body: {
          ...baseValidData,
          queryText: 'db.users.find({ message: "Hello; World" })'
        }
      });
      
      // This is also a limitation of simple semicolon detection
      expect(result.success).toBe(false);
    });

    it('should handle whitespace around semicolons', () => {
      const result = submitQuerySchema.safeParse({
        body: {
          ...baseValidData,
          queryText: 'db.users.find({}) ; db.orders.find({})'
        }
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe('Query mode supports single statements only. For multiple queries, use Script mode.');
    });
  });
});