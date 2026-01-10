import { QueryRepository } from './query.repository';
import { executePostgresQuery } from '../../execution/postgres-query.executor';
import { executePostgresScriptSandboxed } from '../../execution/sandbox/executor';
import { DbInstanceRepository } from '../db-instances/dbInstance.repository';
import { executeMongoQuery } from '../../execution/mongo-query.executor';
import { executeMongoScriptSandboxed } from '../../execution/sandbox/executor';
import { AuditRepository } from '../audit/audit.repository';
import fs from 'fs';

// Helper to read script content safely
function readScriptContent(scriptPath: string | null): string | null {
  if (!scriptPath) return null;
  try {
    return fs.readFileSync(scriptPath, 'utf-8');
  } catch {
    return null;
  }
}

// Helper to add script content to queries
function enrichWithScriptContent(queries: any[]): any[] {
  return queries.map(q => ({
    ...q,
    script_content: q.submission_type === 'SCRIPT' ? readScriptContent(q.script_path) : null
  }));
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
    
    return query;
  }

  static async approveQuery(queryId: string, managerId: string) {
    const query = await QueryRepository.findById(queryId);
    if (!query) {
      throw new Error('Query not found');
    }
  
    if (query.status !== 'PENDING') {
      throw new Error('Query already processed');
    }
  
    const instance = await DbInstanceRepository.findById(query.instance_id);
    if (!instance) {
      throw new Error('DB instance not found');
    }
  
    try {
      let result: any;
  
      if (instance.type === 'POSTGRES') {
        if (!instance.host || !instance.port || !instance.username || !instance.password) {
          throw new Error('Postgres instance missing required connection details');
        }
        
        if (query.submission_type === 'SCRIPT') {
          if (!query.script_path) {
            throw new Error('Postgres script path missing');
          }
  
          result = await executePostgresScriptSandboxed(
            query.script_path,
            {
              PG_HOST: instance.host,
              PG_PORT: String(instance.port),
              PG_USER: instance.username,
              PG_PASSWORD: instance.password,
              PG_DATABASE: query.database_name,
            }
          );
        } else {
          result = await executePostgresQuery(
            {
              host: instance.host,
              port: instance.port,
              username: instance.username,
              password: instance.password,
              database: query.database_name,
            },
            query.query_text
          );
        }
      } else if (instance.type === 'MONGODB') {
        if (!instance.mongo_uri) {
          throw new Error('Mongo URI not configured');
        }
  
        if (query.submission_type === 'SCRIPT') {
          if (!query.script_path) {
            throw new Error('Mongo script path missing');
          }
  
          result = await executeMongoScriptSandboxed(
            query.script_path,
            instance.mongo_uri,
            query.database_name
          );
        } else {
          result = await executeMongoQuery(
            instance.mongo_uri,
            query.database_name,
            query.query_text
          );
        }
      } else {
        throw new Error(`Unsupported database type: ${instance.type}`);
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

  static async rejectQuery(queryId: string, managerId: string, reason?: string) {
    const query = await QueryRepository.findById(queryId);

    if (!query) throw new Error('Query not found');

    const ownsPod = await QueryRepository.isManagerOfPod(
      managerId,
      query.pod_id
    );

    if (!ownsPod) {
      throw new Error('Not authorized to reject this request');
    }

    const result = await QueryRepository.reject(queryId, managerId, reason);
    
    // Log rejection
    await AuditRepository.log({
      queryRequestId: queryId,
      action: 'REJECTED',
      performedBy: managerId,
      details: { reason }
    });
    
    return result;
  }

  static async getQueriesByUser(userId: string, statusFilter?: string[], typeFilter?: string) {
    const queries = await QueryRepository.findByRequesterWithStatus(userId, statusFilter, typeFilter);
    return enrichWithScriptContent(queries);
  }

  static async getQueriesForManager(managerId: string, statusFilter?: string[], typeFilter?: string) {
    const queries = await QueryRepository.findByManagerWithStatus(managerId, statusFilter, typeFilter);
    return enrichWithScriptContent(queries);
  }

  static async getAllQueries(statusFilter?: string[], typeFilter?: string) {
    const queries = await QueryRepository.findAllWithStatus(statusFilter, typeFilter);
    return enrichWithScriptContent(queries);
  }
}
