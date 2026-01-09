import { Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { QueryService } from './query.service';
import { hasElevatedAccess, Role } from '../../constants/roles';



export class QueryController {
  static async submit(req: AuthenticatedRequest, res: Response) {
    try {
      const {
        instanceId,
        databaseName,
        queryText,
        podId,
        comments,
        submissionType
      } = req.body;

      if (submissionType === 'SCRIPT' && !req.file) {
        return res
          .status(400)
          .json({ message: 'Script file required for SCRIPT submission' });
      }

      const query = await QueryService.submitQuery({
        requesterId: req.user!.id,
        instanceId,
        databaseName,
        queryText,
        podId,
        comments,
        submissionType,
        scriptPath: req.file?.path
      });

      return res.status(201).json(query);
    } catch (error: any) {
      return res.status(500).json({ message: 'Failed to submit query', error: error.message });
    }
  }

  static async getPendingForManager(req: AuthenticatedRequest, res: Response) {
    const managerId = req.user!.id;
    const queries = await QueryService.getPendingForManager(managerId);
    res.json(queries);
  }
  
  static async approve(req: AuthenticatedRequest, res: Response) {
    try {
      const queryId = req.params.id;
      const managerId = req.user!.id;
    
      const result = await QueryService.approveQuery(queryId, managerId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ 
        message: 'Query execution failed', 
        error: error.message 
      });
    }
  }
  
  static async reject(req: AuthenticatedRequest, res: Response) {
    try {
      const queryId = req.params.id;
      const managerId = req.user!.id;
      const reason = req.body?.reason;
    
      const result = await QueryService.rejectQuery(queryId, managerId, reason);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ 
        message: 'Failed to reject query', 
        error: error.message 
      });
    }
  }

  static async getQueries(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role as Role;
      const { user, status } = req.query;

      const statusFilter = status ? (status as string).split(',') : undefined;

      let queries;

      if (user === 'me' || !hasElevatedAccess(userRole)) {
        // user=me OR non-elevated roles: always get own queries only
        queries = await QueryService.getQueriesByUser(userId, statusFilter);
      } else {
        // Elevated roles without user=me: get queries for their PODs
        queries = await QueryService.getQueriesForManager(userId, statusFilter);
      }

      res.json(queries);
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to get queries', error: error.message });
    }
  }

  static async getMyQueries(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.id;
    const queries = await QueryService.getMyQueries(userId);
    res.json(queries);
  }
  
  
}