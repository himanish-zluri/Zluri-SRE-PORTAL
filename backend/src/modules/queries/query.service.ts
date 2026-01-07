import { QueryRepository } from './query.repository';

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

  static async approveQuery(queryId: string, managerId: string) {
    // verify manager owns the POD
    const query = await QueryRepository.findById(queryId);

    if (!query) throw new Error('Query not found');

    const ownsPod = await QueryRepository.isManagerOfPod(
      managerId,
      query.pod_id
    );

    if (!ownsPod) {
      throw new Error('Not authorized to approve this request');
    }

    return QueryRepository.updateStatus(
      queryId,
      'APPROVED',
      managerId
    );
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
}
