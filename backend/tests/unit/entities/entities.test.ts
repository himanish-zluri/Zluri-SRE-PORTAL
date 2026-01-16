import { User, UserRole } from '../../../src/entities/User.entity';
import { Pod } from '../../../src/entities/Pod.entity';
import { DbInstance, DbType } from '../../../src/entities/DbInstance.entity';
import { QueryRequest, QueryStatus, SubmissionType } from '../../../src/entities/QueryRequest.entity';
import { QueryAuditLog, AuditAction } from '../../../src/entities/QueryAuditLog.entity';
import { RefreshToken } from '../../../src/entities/RefreshToken.entity';
import * as entitiesIndex from '../../../src/entities';

describe('Entity Classes', () => {
  describe('User', () => {
    it('should create a user with default values', () => {
      const user = new User();
      expect(user.id).toBeDefined();
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('should allow setting all properties', () => {
      const user = new User();
      user.email = 'test@example.com';
      user.name = 'Test User';
      user.passwordHash = 'hashedpassword';
      user.role = UserRole.DEVELOPER;
      user.slackId = 'U12345';
      
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(user.passwordHash).toBe('hashedpassword');
      expect(user.role).toBe(UserRole.DEVELOPER);
      expect(user.slackId).toBe('U12345');
    });

    it('should have UserRole enum values', () => {
      expect(UserRole.DEVELOPER).toBe('DEVELOPER');
      expect(UserRole.MANAGER).toBe('MANAGER');
      expect(UserRole.ADMIN).toBe('ADMIN');
    });
  });

  describe('Pod', () => {
    it('should create a pod with default createdAt', () => {
      const pod = new Pod();
      expect(pod.createdAt).toBeInstanceOf(Date);
    });

    it('should allow setting all properties', () => {
      const pod = new Pod();
      pod.id = 'pod-1';
      pod.name = 'Test Pod';
      const manager = new User();
      pod.manager = manager;
      
      expect(pod.id).toBe('pod-1');
      expect(pod.name).toBe('Test Pod');
      expect(pod.manager).toBe(manager);
    });
  });

  describe('DbInstance', () => {
    it('should create a db instance with default values', () => {
      const instance = new DbInstance();
      expect(instance.id).toBeDefined();
      expect(instance.createdAt).toBeInstanceOf(Date);
    });

    it('should allow setting all properties', () => {
      const instance = new DbInstance();
      instance.name = 'Test Instance';
      instance.host = 'localhost';
      instance.port = 5432;
      instance.username = 'user';
      instance.password = 'pass';
      instance.type = DbType.POSTGRES;
      instance.mongoUri = 'mongodb://localhost';
      
      expect(instance.name).toBe('Test Instance');
      expect(instance.host).toBe('localhost');
      expect(instance.port).toBe(5432);
      expect(instance.username).toBe('user');
      expect(instance.password).toBe('pass');
      expect(instance.type).toBe(DbType.POSTGRES);
      expect(instance.mongoUri).toBe('mongodb://localhost');
    });

    it('should have DbType enum values', () => {
      expect(DbType.POSTGRES).toBe('POSTGRES');
      expect(DbType.MONGODB).toBe('MONGODB');
    });
  });

  describe('QueryRequest', () => {
    it('should create a query request with default values', () => {
      const query = new QueryRequest();
      expect(query.id).toBeDefined();
      expect(query.status).toBe(QueryStatus.PENDING);
      expect(query.createdAt).toBeInstanceOf(Date);
      expect(query.updatedAt).toBeInstanceOf(Date);
    });

    it('should allow setting all properties', () => {
      const query = new QueryRequest();
      const requester = new User();
      const pod = new Pod();
      const instance = new DbInstance();
      const approver = new User();
      
      query.requester = requester;
      query.pod = pod;
      query.instance = instance;
      query.databaseName = 'test_db';
      query.submissionType = SubmissionType.SCRIPT;
      query.queryText = 'SELECT 1';
      query.scriptContent = 'console.log("test")';
      query.comments = 'Test comment';
      query.status = QueryStatus.EXECUTED;
      query.approvedBy = approver;
      query.rejectionReason = 'Test reason';
      query.executionResult = { rows: [] };
      
      expect(query.requester).toBe(requester);
      expect(query.pod).toBe(pod);
      expect(query.instance).toBe(instance);
      expect(query.databaseName).toBe('test_db');
      expect(query.submissionType).toBe(SubmissionType.SCRIPT);
      expect(query.queryText).toBe('SELECT 1');
      expect(query.scriptContent).toBe('console.log("test")');
      expect(query.comments).toBe('Test comment');
      expect(query.status).toBe(QueryStatus.EXECUTED);
      expect(query.approvedBy).toBe(approver);
      expect(query.rejectionReason).toBe('Test reason');
      expect(query.executionResult).toEqual({ rows: [] });
    });

    it('should have QueryStatus enum values', () => {
      expect(QueryStatus.PENDING).toBe('PENDING');
      expect(QueryStatus.APPROVED).toBe('APPROVED');
      expect(QueryStatus.REJECTED).toBe('REJECTED');
      expect(QueryStatus.EXECUTED).toBe('EXECUTED');
      expect(QueryStatus.FAILED).toBe('FAILED');
    });

    it('should have SubmissionType enum values', () => {
      expect(SubmissionType.QUERY).toBe('QUERY');
      expect(SubmissionType.SCRIPT).toBe('SCRIPT');
    });
  });

  describe('QueryAuditLog', () => {
    it('should create an audit log with default values', () => {
      const log = new QueryAuditLog();
      expect(log.id).toBeDefined();
      expect(log.createdAt).toBeInstanceOf(Date);
    });

    it('should allow setting all properties', () => {
      const log = new QueryAuditLog();
      const queryRequest = new QueryRequest();
      const performer = new User();
      
      log.queryRequest = queryRequest;
      log.action = AuditAction.EXECUTED;
      log.performedBy = performer;
      log.details = { key: 'value' };
      
      expect(log.queryRequest).toBe(queryRequest);
      expect(log.action).toBe(AuditAction.EXECUTED);
      expect(log.performedBy).toBe(performer);
      expect(log.details).toEqual({ key: 'value' });
    });

    it('should have AuditAction enum values', () => {
      expect(AuditAction.SUBMITTED).toBe('SUBMITTED');
      expect(AuditAction.APPROVED).toBe('APPROVED');
      expect(AuditAction.REJECTED).toBe('REJECTED');
      expect(AuditAction.EXECUTED).toBe('EXECUTED');
      expect(AuditAction.FAILED).toBe('FAILED');
    });
  });

  describe('RefreshToken', () => {
    it('should create a refresh token with default values', () => {
      const token = new RefreshToken();
      expect(token.id).toBeDefined();
      expect(token.createdAt).toBeInstanceOf(Date);
    });

    it('should allow setting all properties', () => {
      const token = new RefreshToken();
      const user = new User();
      const expiresAt = new Date();
      
      token.user = user;
      token.tokenHash = 'hashedtoken';
      token.expiresAt = expiresAt;
      
      expect(token.user).toBe(user);
      expect(token.tokenHash).toBe('hashedtoken');
      expect(token.expiresAt).toBe(expiresAt);
    });
  });

  describe('Entity Index Exports', () => {
    it('should export all entities', () => {
      expect(entitiesIndex.User).toBeDefined();
      expect(entitiesIndex.UserRole).toBeDefined();
      expect(entitiesIndex.Pod).toBeDefined();
      expect(entitiesIndex.DbInstance).toBeDefined();
      expect(entitiesIndex.DbType).toBeDefined();
      expect(entitiesIndex.QueryRequest).toBeDefined();
      expect(entitiesIndex.QueryStatus).toBeDefined();
      expect(entitiesIndex.SubmissionType).toBeDefined();
      expect(entitiesIndex.RefreshToken).toBeDefined();
      expect(entitiesIndex.QueryAuditLog).toBeDefined();
      expect(entitiesIndex.AuditAction).toBeDefined();
    });
  });
});
