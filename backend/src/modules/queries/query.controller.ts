import { Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { QueryService } from './query.service';



export class QueryController {
  static async submit(req: AuthenticatedRequest, res: Response) {
    try {
      const { instanceId, databaseName, queryText, podId, comments } = req.body;

      // Basic validation (HTTP-level)
      if (!instanceId || !databaseName || !queryText || !podId || !comments) {
        return res.status(400).json({
          message: 'Missing required fields'
        });
      }

      const query = await QueryService.submitQuery({
        requesterId: req.user!.id,
        instanceId,
        databaseName,
        queryText,
        podId,
        comments,
        submissionType: 'QUERY'
      });

      return res.status(201).json(query);
    } catch (error) {
      return res.status(500).json({
        message: 'Failed to submit query'
      });
    }
  }

  static async getPendingForManager(req: AuthenticatedRequest, res: Response) {
    const managerId = req.user!.id;
    const queries = await QueryService.getPendingForManager(managerId);
    res.json(queries);
  }
  
  static async approve(req: AuthenticatedRequest, res: Response) {
    const queryId = req.params.id;
    const managerId = req.user!.id;
  
    const result = await QueryService.approveQuery(queryId, managerId);
    res.json(result);
  }
  
  static async reject(req: AuthenticatedRequest, res: Response) {
    const queryId = req.params.id;
    const managerId = req.user!.id;
    const { reason } = req.body;
  
    const result = await QueryService.rejectQuery(queryId, managerId, reason);
    res.json(result);
  }
  
}
