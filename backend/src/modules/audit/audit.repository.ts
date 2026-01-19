import { getEntityManager } from '../../config/database';
import { QueryAuditLog, AuditAction, User, QueryRequest } from '../../entities';

export { AuditAction };

export interface AuditFilterOptions {
  userId?: string;
  instanceId?: string;
  databaseName?: string;
  action?: string;
  queryId?: string;
  startDate?: Date;
  endDate?: Date;
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
    
    // If we have a queryId search, use a different approach
    if (options.queryId) {
      try {
        // Use the query builder for complex queries with UUID casting
        const qb = em.createQueryBuilder(QueryAuditLog, 'audit')
          .leftJoinAndSelect('audit.performedBy', 'user')
          .leftJoinAndSelect('audit.queryRequest', 'query')
          .where(`query.id::text ILIKE ?`, [`%${options.queryId}%`]);
        
        // Add other filters
        if (options.userId) {
          qb.andWhere('audit.performedBy = ?', [options.userId]);
        }
        if (options.instanceId) {
          qb.andWhere('query.instance = ?', [options.instanceId]);
        }
        if (options.databaseName) {
          qb.andWhere('query.databaseName = ?', [options.databaseName]);
        }
        if (options.action) {
          qb.andWhere('audit.action = ?', [options.action]);
        }
        if (options.startDate) {
          qb.andWhere('audit.createdAt >= ?', [options.startDate]);
        }
        if (options.endDate) {
          qb.andWhere('audit.createdAt <= ?', [options.endDate]);
        }
        
        qb.orderBy({ 'audit.createdAt': 'DESC' })
          .limit(options.limit || 100)
          .offset(options.offset || 0);
        
        return qb.getResultList();
      } catch (error) {
        console.error('Error in queryId search:', error);
        // Fallback to regular search without queryId filter
        const fallbackOptions = { ...options };
        delete fallbackOptions.queryId;
        return this.findWithFilters(fallbackOptions);
      }
    }

    // For non-queryId searches, use the regular approach
    const where: any = {};

    if (options.userId) {
      where.performedBy = options.userId;
    }
    if (options.instanceId) {
      where.queryRequest = { ...where.queryRequest, instance: options.instanceId };
    }
    if (options.databaseName) {
      where.queryRequest = { ...where.queryRequest, databaseName: options.databaseName };
    }
    if (options.action) {
      where.action = options.action;
    }
    if (options.startDate || options.endDate) {
      const dateFilter: any = {};
      if (options.startDate) {
        dateFilter.$gte = options.startDate;
      }
      if (options.endDate) {
        dateFilter.$lte = options.endDate;
      }
      where.createdAt = dateFilter;
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
