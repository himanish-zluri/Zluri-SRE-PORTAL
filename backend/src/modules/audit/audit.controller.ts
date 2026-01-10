import { Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { AuditRepository } from './audit.repository';

export class AuditController {
  static async getAuditLogs(req: AuthenticatedRequest, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      const { queryId, userId } = req.query;

      let logs;

      if (queryId) {
        logs = await AuditRepository.findByQueryId(queryId as string);
      } else if (userId) {
        logs = await AuditRepository.findByUserId(userId as string, limit, offset);
      } else {
        logs = await AuditRepository.findAll(limit, offset);
      }

      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to get audit logs', error: error.message });
    }
  }

  static async getAuditLogsByQuery(req: AuthenticatedRequest, res: Response) {
    try {
      const queryId = req.params.queryId;
      const logs = await AuditRepository.findByQueryId(queryId);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to get audit logs', error: error.message });
    }
  }
}
