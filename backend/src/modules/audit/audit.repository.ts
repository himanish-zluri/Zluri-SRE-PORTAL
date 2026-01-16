import { getEntityManager } from '../../config/database';
import { QueryAuditLog, AuditAction, User, QueryRequest } from '../../entities';

export { AuditAction };

export interface AuditFilterOptions {
  userId?: string;
  databaseName?: string;
  action?: string;
  limit?: number;
  offset?: number;
}

export class AuditRepository {
  static async log(data: {
    queryRequestId: string;
    action: AuditAction | string;
    performedBy: string;
    details?: Record<string, any>;
  }): Promise<QueryAuditLog> {
    const em = getEntityManager();
    
    const queryRequest = await em.findOneOrFail(QueryRequest, { id: data.queryRequestId });
    const user = await em.findOneOrFail(User, { id: data.performedBy });
    
    const auditLog = new QueryAuditLog();
    auditLog.queryRequest = queryRequest;
    auditLog.action = data.action as AuditAction;
    auditLog.performedBy = user;
    auditLog.details = data.details || {};
    
    await em.persistAndFlush(auditLog);
    return auditLog;
  }

  static async findByQueryId(queryRequestId: string): Promise<QueryAuditLog[]> {
    const em = getEntityManager();
    return em.find(
      QueryAuditLog,
      { queryRequest: queryRequestId },
      {
        populate: ['performedBy'],
        orderBy: { createdAt: 'ASC' },
      }
    );
  }

  static async findByUserId(userId: string, limit = 100, offset = 0): Promise<QueryAuditLog[]> {
    const em = getEntityManager();
    return em.find(
      QueryAuditLog,
      { performedBy: userId },
      {
        populate: ['performedBy', 'queryRequest'],
        orderBy: { createdAt: 'DESC' },
        limit,
        offset,
      }
    );
  }

  static async findAll(limit = 100, offset = 0): Promise<QueryAuditLog[]> {
    const em = getEntityManager();
    return em.find(
      QueryAuditLog,
      {},
      {
        populate: ['performedBy', 'queryRequest'],
        orderBy: { createdAt: 'DESC' },
        limit,
        offset,
      }
    );
  }

  static async findByDatabaseName(databaseName: string, limit = 100, offset = 0): Promise<QueryAuditLog[]> {
    const em = getEntityManager();
    return em.find(
      QueryAuditLog,
      { queryRequest: { databaseName } },
      {
        populate: ['performedBy', 'queryRequest'],
        orderBy: { createdAt: 'DESC' },
        limit,
        offset,
      }
    );
  }

  static async findWithFilters(options: AuditFilterOptions): Promise<QueryAuditLog[]> {
    const em = getEntityManager();
    const where: any = {};

    if (options.userId) {
      where.performedBy = options.userId;
    }
    if (options.databaseName) {
      where.queryRequest = { ...where.queryRequest, databaseName: options.databaseName };
    }
    if (options.action) {
      where.action = options.action;
    }

    return em.find(
      QueryAuditLog,
      where,
      {
        populate: ['performedBy', 'queryRequest'],
        orderBy: { createdAt: 'DESC' },
        limit: options.limit || 100,
        offset: options.offset || 0,
      }
    );
  }
}
