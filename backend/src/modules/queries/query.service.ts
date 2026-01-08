import { QueryRepository } from './query.repository';
import { executePostgresQuery } from '../../execution/postgres.executor';
import { DbInstanceDatabaseRepository } from '../db-instances/dbInstanceDatabase.repository';
import { DbInstanceRepository } from '../db-instances/dbInstance.repository';

export class QueryService {
  static async submitQuery(input: {
    requesterId: string;
    instanceId: string;
    databaseName: string;
    queryText: string;
    podId: string;
    comments: string;
    submissionType: 'QUERY';
  }) {
    // Future logic will live here:
    // - query validation
    // - rate limiting
    // - dangerous query checks
    // - approval routing rules

    return QueryRepository.create(input);
  }

  static async getPendingForManager(managerId: string) {
    return QueryRepository.findPendingByManager(managerId);
  }

  // static async approveQuery(queryId: string, managerId: string) {
  //   // verify manager owns the POD
  //   const query = await QueryRepository.findById(queryId);

  //   if (!query) throw new Error('Query not found');

  //   const ownsPod = await QueryRepository.isManagerOfPod(
  //     managerId,
  //     query.pod_id
  //   );

  //   if (!ownsPod) {
  //     throw new Error('Not authorized to approve this request');
  //   }

  //   return QueryRepository.updateStatus(
  //     queryId,
  //     'APPROVED',
  //     managerId
  //   );
  // }

  static async approveQuery(queryId: string, managerId: string) {
    const query = await QueryRepository.findById(queryId);
  
    if (!query) {
      throw new Error('Query not found');
    }
  
    if (query.status !== 'PENDING') {
      throw new Error('Query already processed');
    }
  
    // fetch db instance
    const instance =
  await DbInstanceRepository.findById(query.instance_id);

  
    if (!instance) {
      throw new Error('DB instance not found');
    }
  
    try {
      const result = await executePostgresQuery(
        {
          host: instance.host,
          port: instance.port,
          username: instance.username,
          password: instance.password,
          database: query.database_name,
        },
        query.query_text
      );
  
      await QueryRepository.markExecuted(
        queryId,
        managerId,
        result
      );
  
      return { status: 'EXECUTED', result };
  
    } catch (error: any) {
      await QueryRepository.markFailed(
        queryId,
        managerId,
        error.message
      );
  
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
