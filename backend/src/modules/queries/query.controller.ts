import { Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { QueryService } from './query.service';



export class QueryController {
  static async submit(req: AuthenticatedRequest, res: Response) {
    try {
      console.log('📝 Query submission request received');
      console.log('📋 Body:', req.body);
      console.log('📁 File:', req.file);
      console.log('👤 User:', req.user);
      
      const {
        instanceId,
        databaseName,
        queryText,
        podId,
        comments,
        submissionType
      } = req.body;

      console.log('🔍 Extracted fields:', {
        instanceId,
        databaseName,
        queryText,
        podId,
        comments,
        submissionType
      });

      // 🔴 STEP 1: Validate SCRIPT submission
      if (submissionType === 'SCRIPT') {
        if (!req.file) {
          console.log('❌ No file uploaded for SCRIPT submission');
          return res
            .status(400)
            .json({ message: 'Script file required for SCRIPT submission' });
        }
        console.log('✅ File uploaded for SCRIPT submission:', req.file.path);
      }

      console.log('🚀 Calling QueryService.submitQuery...');
      
      // 🔴 STEP 2: Call service and pass scriptPath
      const query = await QueryService.submitQuery({
        requesterId: req.user!.id,
        instanceId,
        databaseName,
        queryText,
        podId,
        comments,
        submissionType,
        scriptPath: req.file?.path // ✅ THIS IS THE LINE YOU ASKED ABOUT
      });

      console.log('✅ Query submitted successfully:', query);
      return res.status(201).json(query);
    } catch (error: any) {
      console.error('❌ Query submission error:', error);
      console.error('❌ Error stack:', error.stack);
      return res.status(500).json({ message: 'Failed to submit query', error: error.message });
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

  static async getMyQueries(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.id;
  
    const queries = await QueryService.getMyQueries(userId);
  
    res.json(queries);
  }
  
  
}
