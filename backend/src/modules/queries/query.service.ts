import { QueryRepository } from './query.repository';
import { executePostgresQuery } from '../../execution/postgres.executor';
import { executeScript } from '../../execution/script.executor';
import { DbInstanceRepository } from '../db-instances/dbInstance.repository';
import { executeMongoQuery } from '../../execution/mongo.executor';
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
    // Future logic:
    // - validation
    // - rate limiting
    // - dangerous query checks
    // - approval routing rules
    return QueryRepository.create(input);
  }

  static async getPendingForManager(managerId: string) {
    return QueryRepository.findPendingByManager(managerId);
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
  
      // 🔹 POSTGRES execution
      if (instance.type === 'POSTGRES') {
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
  
      // 🔹 MONGODB execution
      else if (instance.type === 'MONGODB') {
        if (!instance.mongo_uri) {
          throw new Error('Mongo URI not configured');
        }
  
        result = await executeMongoQuery(
          instance.mongo_uri,
          query.database_name,
          query.query_text
        );
      }
  
      // 🔹 Safety fallback (should never hit)
      else {
        throw new Error(`Unsupported database type: ${instance.type}`);
      }
  
      await QueryRepository.markExecuted(queryId, managerId, result);
      return { status: 'EXECUTED', result };
  
    } catch (error: any) {
      await QueryRepository.markFailed(queryId, managerId, error.message);
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

    return QueryRepository.reject(queryId, managerId, reason);
  }

  static async getMyQueries(userId: string) {
    return QueryRepository.findByRequester(userId);
  }
}
