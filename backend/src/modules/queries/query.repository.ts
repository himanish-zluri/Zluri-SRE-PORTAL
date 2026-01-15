import { getEntityManager } from '../../config/database';
import { QueryRequest, QueryStatus, SubmissionType, User, Pod, DbInstance } from '../../entities';

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export class QueryRepository {
  static async findById(id: string): Promise<QueryRequest | null> {
    const em = getEntityManager();
    return em.findOne(QueryRequest, { id }, { 
      populate: ['requester', 'pod', 'instance', 'approvedBy'] 
    });
  }

  static async isManagerOfPod(managerId: string, podId: string): Promise<boolean> {
    const em = getEntityManager();
    const pod = await em.findOne(Pod, { id: podId, manager: managerId });
    return pod !== null;
  }

  static async reject(queryId: string, managerId: string, reason?: string): Promise<QueryRequest> {
    const em = getEntityManager();
    const query = await em.findOneOrFail(QueryRequest, { id: queryId });
    const manager = await em.findOneOrFail(User, { id: managerId });
    
    query.status = QueryStatus.REJECTED;
    query.approvedBy = manager;
    query.rejectionReason = reason || undefined;
    query.updatedAt = new Date();
    
    await em.flush();
    return query;
  }

  static async create(data: {
    requesterId: string;
    instanceId: string;
    databaseName: string;
    queryText: string;
    podId: string;
    comments: string;
    submissionType: 'QUERY' | 'SCRIPT';
    scriptPath?: string;
  }): Promise<QueryRequest> {
    const em = getEntityManager();
    
    const requester = await em.findOneOrFail(User, { id: data.requesterId });
    const instance = await em.findOneOrFail(DbInstance, { id: data.instanceId });
    const pod = await em.findOneOrFail(Pod, { id: data.podId });
    
    const query = new QueryRequest();
    query.requester = requester;
    query.instance = instance;
    query.pod = pod;
    query.databaseName = data.databaseName;
    query.queryText = data.queryText || '[SCRIPT SUBMISSION]';
    query.comments = data.comments;
    query.submissionType = data.submissionType as SubmissionType;
    query.scriptPath = data.scriptPath;
    query.status = QueryStatus.PENDING;
    
    await em.persistAndFlush(query);
    return query;
  }

  static async findByRequesterWithStatus(
    userId: string,
    statusFilter?: string[],
    typeFilter?: string,
    pagination?: PaginationOptions
  ): Promise<QueryRequest[]> {
    const em = getEntityManager();
    const where: any = { requester: userId };
    
    if (statusFilter && statusFilter.length > 0) {
      where.status = { $in: statusFilter };
    }
    
    if (typeFilter) {
      where.instance = { type: typeFilter };
    }
    
    return em.find(QueryRequest, where, {
      populate: ['requester', 'pod', 'instance', 'approvedBy'],
      orderBy: { createdAt: 'DESC' },
      limit: pagination?.limit,
      offset: pagination?.offset,
    });
  }

  static async countByRequester(
    userId: string,
    statusFilter?: string[],
    typeFilter?: string
  ): Promise<number> {
    const em = getEntityManager();
    const where: any = { requester: userId };
    
    if (statusFilter && statusFilter.length > 0) {
      where.status = { $in: statusFilter };
    }
    
    if (typeFilter) {
      where.instance = { type: typeFilter };
    }
    
    return em.count(QueryRequest, where);
  }

  static async findByManagerWithStatus(
    managerId: string,
    statusFilter?: string[],
    typeFilter?: string,
    pagination?: PaginationOptions
  ): Promise<QueryRequest[]> {
    const em = getEntityManager();
    const where: any = { pod: { manager: managerId } };
    
    if (statusFilter && statusFilter.length > 0) {
      where.status = { $in: statusFilter };
    }
    
    if (typeFilter) {
      where.instance = { type: typeFilter };
    }
    
    return em.find(QueryRequest, where, {
      populate: ['requester', 'pod', 'instance', 'approvedBy'],
      orderBy: { createdAt: 'DESC' },
      limit: pagination?.limit,
      offset: pagination?.offset,
    });
  }

  static async countByManager(
    managerId: string,
    statusFilter?: string[],
    typeFilter?: string
  ): Promise<number> {
    const em = getEntityManager();
    const where: any = { pod: { manager: managerId } };
    
    if (statusFilter && statusFilter.length > 0) {
      where.status = { $in: statusFilter };
    }
    
    if (typeFilter) {
      where.instance = { type: typeFilter };
    }
    
    return em.count(QueryRequest, where);
  }

  static async findAllWithStatus(
    statusFilter?: string[],
    typeFilter?: string,
    pagination?: PaginationOptions
  ): Promise<QueryRequest[]> {
    const em = getEntityManager();
    const where: any = {};
    
    if (statusFilter && statusFilter.length > 0) {
      where.status = { $in: statusFilter };
    }
    
    if (typeFilter) {
      where.instance = { type: typeFilter };
    }
    
    return em.find(QueryRequest, where, {
      populate: ['requester', 'pod', 'instance', 'approvedBy'],
      orderBy: { createdAt: 'DESC' },
      limit: pagination?.limit,
      offset: pagination?.offset,
    });
  }

  static async countAll(statusFilter?: string[], typeFilter?: string): Promise<number> {
    const em = getEntityManager();
    const where: any = {};
    
    if (statusFilter && statusFilter.length > 0) {
      where.status = { $in: statusFilter };
    }
    
    if (typeFilter) {
      where.instance = { type: typeFilter };
    }
    
    return em.count(QueryRequest, where);
  }

  static async markExecuted(queryId: string, managerId: string, result: any): Promise<void> {
    const em = getEntityManager();
    const query = await em.findOneOrFail(QueryRequest, { id: queryId });
    const manager = await em.findOneOrFail(User, { id: managerId });
    
    query.status = QueryStatus.EXECUTED;
    query.approvedBy = manager;
    query.executionResult = result;
    query.updatedAt = new Date();
    
    await em.flush();
  }

  static async markFailed(queryId: string, managerId: string, error: string): Promise<void> {
    const em = getEntityManager();
    const query = await em.findOneOrFail(QueryRequest, { id: queryId });
    const manager = await em.findOneOrFail(User, { id: managerId });
    
    query.status = QueryStatus.FAILED;
    query.approvedBy = manager;
    query.executionResult = { error };
    query.updatedAt = new Date();
    
    await em.flush();
  }
}
