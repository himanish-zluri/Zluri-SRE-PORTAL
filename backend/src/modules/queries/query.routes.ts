import { Router } from 'express';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware';
import { QueryController } from './query.controller';
import { uploadScript } from '../../middlewares/upload.middleware';
import { asyncHandler } from '../../middlewares/errorHandler.middleware';
import { validate, submitQuerySchema, queryIdParamSchema, rejectQuerySchema, getQueriesSchema } from '../../validation';

const router = Router();

// ============ GET ROUTES ============
// GET /api/queries - Queries submitted to manager/admin for approval
router.get('/', requireAuth, requireRole(['MANAGER', 'ADMIN']), validate(getQueriesSchema), asyncHandler(QueryController.getQueries));

// GET /api/queries/my-submissions - User's own submitted queries
router.get('/my-submissions', requireAuth, validate(getQueriesSchema), asyncHandler(QueryController.getMySubmissions));

// ============ POST ROUTES ============
router.post('/', requireAuth, uploadScript.single('script'), validate(submitQuerySchema), asyncHandler(QueryController.submit));
router.post('/:id/approve', requireAuth, requireRole(['MANAGER', 'ADMIN']), validate(queryIdParamSchema), asyncHandler(QueryController.approve));
router.post('/:id/reject', requireAuth, requireRole(['MANAGER', 'ADMIN']), validate(rejectQuerySchema), asyncHandler(QueryController.reject));

export default router;
