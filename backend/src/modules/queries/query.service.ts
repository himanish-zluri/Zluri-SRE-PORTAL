import { QueryRepository, PaginationOptions } from './query.repository';
import { executePostgresQuery } from '../../execution/postgres-query.executor';
import { executePostgresScriptSandboxed } from '../../execution/sandbox/executor';
import { DbInstanceRepository } from '../db-instances/dbInstance.repository';
import { executeMongoQuery } from '../../execution/mongo-query.executor';
import { executeMongoScriptSandboxed } from '../../execution/sandbox/executor';
import { AuditRepository } from '../audit/audit.repository';
import { NotFoundError, ConflictError, BadRequestError, ForbiddenError } from '../../errors';
import { QueryRequest } from '../../entities';
import fs from 'fs';

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Helper to read script content safely
function readScriptContent(scriptPath: string | null | undefined): string | null {
  if (!scriptPath) return null;
  try {
    return fs.readFileSync(scriptPath, 'utf-8');
  } catch {
    return null;
  }
}

// Helper to serialize query for API response
function serializeQuery(query: QueryRequest): any {
  return {
    id: query.id,
    requester_id: query.requester?.id,
    pod_id: query.pod?.id,
    instance_id: query.instance?.id,
    database_name: query.databaseName,
    submission_type: query.submissionType,
    query_text: query.queryText,
    script_path: query.scriptPath,
    comments: query.comments,
    status: query.status,
    approved_by: query.approvedBy?.id,
    rejection_reason: query.rejectionReason,
    execution_result: query.executionResult,
    created_at: query.createdAt,
    updated_at: query.updatedAt,
    script_content: query.submissionType === 'SCRIPT' ? readScriptContent(query.scriptPath) : null,
  };
}

// Helper to add script content to queries
function enrichWithScriptContent(queries: QueryRequest[]): any[] {
  return queries.map(serializeQuery);
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
    scriptPath?: string;
  }) {
    const query = await QueryRepository.create(input);
    
    // Log submission
    await AuditRepository.log({
      queryRequestId: query.id,
      action: 'SUBMITTED',
      performedBy: input.requesterId,
      details: { submissionType: input.submissionType, podId: input.podId }
    });
    
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
  
    try {
      let result: any;
  
      if (instance.type === 'POSTGRES') {
        if (!instance.host || !instance.port || !instance.username || !instance.password) {
          throw new BadRequestError('Postgres instance missing required connection details');
        }
        
        if (query.submissionType === 'SCRIPT') {
          if (!query.scriptPath) {
            throw new BadRequestError('Postgres script path missing');
          }
  
          result = await executePostgresScriptSandboxed(
            query.scriptPath,
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
          if (!query.scriptPath) {
            throw new BadRequestError('Mongo script path missing');
          }
  
          result = await executeMongoScriptSandboxed(
            query.scriptPath,
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
        details: { instanceType: instance.type }
      });
      
      return { status: 'EXECUTED', result };
  
    } catch (error: any) {
      await QueryRepository.markFailed(queryId, managerId, error.message);
      
      // Log failure
      await AuditRepository.log({
        queryRequestId: queryId,
        action: 'FAILED',
        performedBy: managerId,
        details: { error: error.message }
      });
      
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

    const result = await QueryRepository.reject(queryId, managerId, reason);
    
    // Log rejection
    await AuditRepository.log({
      queryRequestId: queryId,
      action: 'REJECTED',
      performedBy: managerId,
      details: { reason }
    });
    
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
      data: enrichWithScriptContent(queries),
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
      data: enrichWithScriptContent(queries),
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
      data: enrichWithScriptContent(queries),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + queries.length < total
      }
    };
  }
}
