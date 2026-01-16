import { Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { AuditRepository } from './audit.repository';
import { QueryAuditLog } from '../../entities';

// Serialize audit log for API response
function serializeAuditLog(log: QueryAuditLog) {
  return {
    id: log.id,
    query_request_id: log.queryRequest?.id,
    action: log.action,
    performed_by: log.performedBy?.id,
    performed_by_name: log.performedBy?.name,
    performed_by_email: log.performedBy?.email,
    details: log.details || {},
    created_at: log.createdAt,
  };
}

export class AuditController {
  static async getAuditLogs(req: AuthenticatedRequest, res: Response) {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const { queryId, userId, databaseName, action } = req.query;

    let logs;

    if (queryId) {
      logs = await AuditRepository.findByQueryId(queryId as string);
    } else if (userId || databaseName || action) {
      // Use combined filter method
      logs = await AuditRepository.findWithFilters({
        userId: userId as string,
        databaseName: databaseName as string,
        action: action as string,
        limit,
        offset,
      });
    } else {
      logs = await AuditRepository.findAll(limit, offset);
    }

    res.json(logs.map(serializeAuditLog));
  }

  static async getAuditLogsByQuery(req: AuthenticatedRequest, res: Response) {
    const queryId = req.params.queryId;
    const logs = await AuditRepository.findByQueryId(queryId);
    res.json(logs.map(serializeAuditLog));
  }
}
