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
}
