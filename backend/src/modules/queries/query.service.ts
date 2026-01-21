import { QueryRepository, PaginationOptions } from './query.repository';
import { executePostgresQuery } from '../../execution/postgres-query.executor';
import { executePostgresScriptSandboxed } from '../../execution/sandbox/executor';
import { DbInstanceRepository } from '../db-instances/dbInstance.repository';
import { executeMongoQuery } from '../../execution/mongo-query.executor';
import { executeMongoScriptSandboxed } from '../../execution/sandbox/executor';
import { AuditRepository } from '../audit/audit.repository';
import { NotFoundError, ConflictError, BadRequestError, ForbiddenError, QueryExecutionError } from '../../errors';
import { QueryRequest } from '../../entities';
import { SlackService } from '../../services/slack.service';
import { UserRepository } from '../users/user.repository';

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Helper to serialize query for API response
function serializeQuery(query: QueryRequest): any {
  return {
    id: query.id,
    requester_id: query.requester?.id,
    requester_name: query.requester?.name,
    requester_email: query.requester?.email,
    pod_id: query.pod?.id,
    pod_manager_name: query.pod?.manager?.name,
    instance_id: query.instance?.id,
    instance_name: query.instance?.name,
    database_name: query.databaseName,
    submission_type: query.submissionType,
    query_text: query.queryText,
    script_content: query.scriptContent,
    comments: query.comments,
    status: query.status,
    approved_by: query.approvedBy?.id,
    rejection_reason: query.rejectionReason,
    execution_result: query.executionResult,
    created_at: query.createdAt,
    updated_at: query.updatedAt,
  };
}

// Helper to serialize queries array
function serializeQueries(queries: QueryRequest[]): any[] {
  return queries.map(serializeQuery);
}

// Helper to build consistent audit details
function buildAuditDetails(query: QueryRequest, additionalDetails: Record<string, any> = {}): Record<string, any> {
  return {
    submissionType: query.submissionType,
    podId: query.pod?.id,
    podName: query.pod?.name,
    instanceId: query.instance?.id,
    instanceName: query.instance?.name,
    instanceType: query.instance?.type,
    databaseName: query.databaseName,
    requesterName: query.requester?.name,
    requesterEmail: query.requester?.email,
    ...additionalDetails
  };
}

// Helper to build query info for Slack notifications
function buildSlackQueryInfo(query: QueryRequest): {
  id: string;
  requesterName: string;
  requesterEmail: string;
  requesterSlackId?: string;
  databaseName: string;
  instanceName: string;
  podId: string;
  submissionType: 'QUERY' | 'SCRIPT';
  queryText?: string;
  scriptContent?: string;
  comments?: string;
} {
  return {
    id: query.id,
    requesterName: query.requester?.name || 'Unknown',
    requesterEmail: query.requester?.email || '',
    requesterSlackId: query.requester?.slackId,
    databaseName: query.databaseName,
    instanceName: query.instance?.name || 'Unknown',
    podId: query.pod?.id || 'Unknown',
    submissionType: query.submissionType as 'QUERY' | 'SCRIPT',
    queryText: query.queryText,
    scriptContent: query.scriptContent,
    comments: query.comments,
  };
}

export class QueryService {
  static async submitQuery(input: {
    requesterId: string;
    instanceId: string;
    databaseName: string;
    queryText: string;
    podId: string;
    comments: string;
    submissionType: 'QUERY' | 'SCRIPT';
    scriptContent?: string;
  }) {
    const query = await QueryRepository.create(input);
    
    // Log submission
    await AuditRepository.log({
      queryRequestId: query.id,
      action: 'SUBMITTED',
      performedBy: input.requesterId,
      details: buildAuditDetails(query)
    });

    // Send Slack notification for new submission
    try {
      await SlackService.notifyNewSubmission(buildSlackQueryInfo(query));
    } catch (err) {
      console.error('Slack notification failed:', err);
    }
    
    return serializeQuery(query);
  }

  static async approveQuery(queryId: string, managerId: string) {
    const query = await QueryRepository.findById(queryId);
    if (!query) {
      throw new NotFoundError('Query not found');
    }
  
    if (query.status !== 'PENDING') {
      throw new ConflictError('Query already processed');
    }
  
    const instance = await DbInstanceRepository.findById(query.instance.id);
    if (!instance) {
      throw new NotFoundError('DB instance not found');
    }

    // Get manager info for Slack notification
    const manager = await UserRepository.findById(managerId);
    const managerName = manager?.name || 'Unknown';
    const slackQueryInfo = buildSlackQueryInfo(query);
  
    try {
      let result: any;
  
      if (instance.type === 'POSTGRES') {
        if (!instance.host || !instance.port || !instance.username || !instance.password) {
          throw new BadRequestError('Postgres instance missing required connection details');
        }
        
        if (query.submissionType === 'SCRIPT') {
          if (!query.scriptContent) {
            throw new BadRequestError('Script content missing');
          }
  
          result = await executePostgresScriptSandboxed(
            query.scriptContent,
            {
              PG_HOST: instance.host,
              PG_PORT: String(instance.port),
              PG_USER: instance.username,
              PG_PASSWORD: instance.password,
              PG_DATABASE: query.databaseName,
            }
          );
        } else {
          result = await executePostgresQuery(
            {
              host: instance.host,
              port: instance.port,
              username: instance.username,
              password: instance.password,
              database: query.databaseName,
            },
            query.queryText
          );
        }
      } else if (instance.type === 'MONGODB') {
        if (!instance.mongo_uri) {
          throw new BadRequestError('Mongo URI not configured');
        }
  
        if (query.submissionType === 'SCRIPT') {
          if (!query.scriptContent) {
            throw new BadRequestError('Script content missing');
          }
  
          result = await executeMongoScriptSandboxed(
            query.scriptContent,
            instance.mongo_uri,
            query.databaseName
          );
        } else {
          result = await executeMongoQuery(
            instance.mongo_uri,
            query.databaseName,
            query.queryText
          );
        }
      } else {
        throw new BadRequestError(`Unsupported database type: ${instance.type}`);
      }
  
      await QueryRepository.markExecuted(queryId, managerId, result);
      
      // Log execution
      await AuditRepository.log({
        queryRequestId: queryId,
        action: 'EXECUTED',
        performedBy: managerId,
        details: buildAuditDetails(query, {
          executionTime: new Date().toISOString(),
          approvedBy: managerName
        })
      });

      // Send Slack success notification
      try {
        await SlackService.notifyExecutionSuccess(slackQueryInfo, result, managerName);
      } catch (err) {
        console.error('Slack notification failed:', err);
      }
      
      return { status: 'EXECUTED', result };
  
    } catch (error: any) {
      await QueryRepository.markFailed(queryId, managerId, error.message);
      
      // Log failure
      await AuditRepository.log({
        queryRequestId: queryId,
        action: 'FAILED',
        performedBy: managerId,
        details: buildAuditDetails(query, {
          error: error.message,
          failureTime: new Date().toISOString(),
          approvedBy: managerName
        })
      });

      // Send Slack failure notification
      try {
        await SlackService.notifyExecutionFailure(slackQueryInfo, error.message, managerName);
      } catch (err) {
        console.error('Slack notification failed:', err);
      }
      
      throw error;
    }
  }

  static async rejectQuery(queryId: string, managerId: string, userRole: string, reason?: string) {
    const query = await QueryRepository.findById(queryId);

    if (!query) {
      throw new NotFoundError('Query not found');
    }

    // ADMINs can reject any query, MANAGERs can only reject queries for their PODs
    if (userRole !== 'ADMIN') {
      const ownsPod = await QueryRepository.isManagerOfPod(
        managerId,
        query.pod.id
      );

      if (!ownsPod) {
        throw new ForbiddenError('Not authorized to reject this request');
      }
    }

    // Get manager info for Slack notification
    const manager = await UserRepository.findById(managerId);
    const managerName = manager?.name || 'Unknown';
    const slackQueryInfo = buildSlackQueryInfo(query);

    const result = await QueryRepository.reject(queryId, managerId, reason);
    
    // Log rejection
    await AuditRepository.log({
      queryRequestId: queryId,
      action: 'REJECTED',
      performedBy: managerId,
      details: { reason }
    });

    // Send Slack rejection notification (DM to requester only)
    try {
      await SlackService.notifyRejection(slackQueryInfo, reason, managerName);
    } catch (err) {
      console.error('Slack notification failed:', err);
    }
    
    return serializeQuery(result);
  }

  static async getQueriesByUser(
    userId: string, 
    statusFilter?: string[], 
    typeFilter?: string,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<any>> {
    const [queries, total] = await Promise.all([
      QueryRepository.findByRequesterWithStatus(userId, statusFilter, typeFilter, pagination),
      QueryRepository.countByRequester(userId, statusFilter, typeFilter)
    ]);
    
    const limit = pagination?.limit ?? total;
    const offset = pagination?.offset ?? 0;
    
    return {
      data: serializeQueries(queries),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + queries.length < total
      }
    };
  }

  static async getQueriesForManager(
    managerId: string, 
    statusFilter?: string[], 
    typeFilter?: string,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<any>> {
    const [queries, total] = await Promise.all([
      QueryRepository.findByManagerWithStatus(managerId, statusFilter, typeFilter, pagination),
      QueryRepository.countByManager(managerId, statusFilter, typeFilter)
    ]);
    
    const limit = pagination?.limit ?? total;
    const offset = pagination?.offset ?? 0;
    
    return {
      data: serializeQueries(queries),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + queries.length < total
      }
    };
  }

  static async getAllQueries(
    statusFilter?: string[], 
    typeFilter?: string,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<any>> {
    const [queries, total] = await Promise.all([
      QueryRepository.findAllWithStatus(statusFilter, typeFilter, pagination),
      QueryRepository.countAll(statusFilter, typeFilter)
    ]);
    
    const limit = pagination?.limit ?? total;
    const offset = pagination?.offset ?? 0;
    
    return {
      data: serializeQueries(queries),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + queries.length < total
      }
    };
  }

  static async getQueryById(queryId: string, userId: string, userRole: string): Promise<any> {
    const query = await QueryRepository.findById(queryId);
    if (!query) {
      throw new NotFoundError('Query not found');
    }

    // Check permissions
    if (userRole === 'ADMIN') {
      // Admin can see any query
    } else if (userRole === 'MANAGER') {
      // Manager can see queries for their PODs
      const userPods = await UserRepository.getUserPods(userId);
      const podIds = userPods.map((pod: any) => pod.id);
      if (!podIds.includes(query.pod?.id || '')) {
        throw new ForbiddenError('You can only view queries for your PODs');
      }
    } else {
      // Regular users can only see their own queries
      if (query.requester?.id !== userId) {
        throw new ForbiddenError('You can only view your own queries');
      }
    }

    return serializeQuery(query);
  }
}
