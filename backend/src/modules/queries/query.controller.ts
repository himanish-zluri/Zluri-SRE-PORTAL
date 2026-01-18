import { Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { QueryService } from './query.service';
import { hasElevatedAccess, Role } from '../../constants/roles';
import { BadRequestError } from '../../errors';

export class QueryController {
  static async submit(req: AuthenticatedRequest, res: Response) {
    const {
      instanceId,
      databaseName,
      queryText,
      podId,
      comments,
      submissionType
    } = req.body;

    if (submissionType === 'SCRIPT' && !req.file) {
      throw new BadRequestError('Script file required for SCRIPT submission');
    }

    // Read script content from memory buffer
    const scriptContent = req.file ? req.file.buffer.toString('utf-8') : undefined;
    
    // Validate script content is not empty or whitespace-only
    if (submissionType === 'SCRIPT' && scriptContent !== undefined && scriptContent.trim().length === 0) {
      throw new BadRequestError('Script file cannot be empty or contain only spaces');
    }

    const query = await QueryService.submitQuery({
      requesterId: req.user!.id,
      instanceId,
      databaseName,
      queryText,
      podId,
      comments,
      submissionType,
      scriptContent
    });

    return res.status(201).json(query);
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
    const userRole = req.user!.role;
    const reason = req.body?.reason;
  
    const result = await QueryService.rejectQuery(queryId, managerId, userRole, reason);
    res.json(result);
  }

  /**
   * GET /api/queries - Get queries submitted to manager/admin for approval
   * Manager: sees queries for their PODs
   * Admin: sees ALL queries across the system
   * Query params: status, type, limit, offset
   */
  static async getQueries(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.id;
    const userRole = req.user!.role as Role;
    const { status, type, limit, offset } = req.query;

    const statusFilter = status ? (status as string).split(',') : undefined;
    const typeFilter = type as string | undefined;
    const pagination = {
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined
    };

    let result;

    if (userRole === 'ADMIN') {
      // Admin: get ALL queries across the system
      result = await QueryService.getAllQueries(statusFilter, typeFilter, pagination);
    } else if (hasElevatedAccess(userRole)) {
      // Manager: get queries for their PODs only
      result = await QueryService.getQueriesForManager(userId, statusFilter, typeFilter, pagination);
    } else {
      // DEV users shouldn't access this route - return empty
      result = { data: [], pagination: { total: 0, limit: 0, offset: 0, hasMore: false } };
    }

    res.json(result);
  }

  /**
   * GET /api/queries/my-submissions - Get user's own submitted queries
   * All users can access this to see their own submissions
   * Query params: status, type, limit, offset
   */
  static async getMySubmissions(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.id;
    const { status, type, limit, offset } = req.query;

    const statusFilter = status ? (status as string).split(',') : undefined;
    const typeFilter = type as string | undefined;
    const pagination = {
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined
    };

    const result = await QueryService.getQueriesByUser(userId, statusFilter, typeFilter, pagination);
    res.json(result);
  }
}