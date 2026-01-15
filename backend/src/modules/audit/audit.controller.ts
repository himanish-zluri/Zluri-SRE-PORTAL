import { Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { AuditRepository } from './audit.repository';

export class AuditController {
  static async getAuditLogs(req: AuthenticatedRequest, res: Response) {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const { queryId, userId, databaseName } = req.query;

    let logs;

    if (queryId) {
      logs = await AuditRepository.findByQueryId(queryId as string);
    } else if (userId) {
      logs = await AuditRepository.findByUserId(userId as string, limit, offset);
    } else if (databaseName) {
      logs = await AuditRepository.findByDatabaseName(databaseName as string, limit, offset);
    } else {
      logs = await AuditRepository.findAll(limit, offset);
    }

    res.json(logs);
  }

  static async getAuditLogsByQuery(req: AuthenticatedRequest, res: Response) {
    const queryId = req.params.queryId;
    const logs = await AuditRepository.findByQueryId(queryId);
    res.json(logs);
  }
}
