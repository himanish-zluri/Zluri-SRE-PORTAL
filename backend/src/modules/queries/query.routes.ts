import { Router } from 'express';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware';
import { QueryController } from './query.controller';
import { uploadScript } from '../../middlewares/upload.middleware';

const router = Router();

// ============ GET ROUTES ============
// GET /api/queries?user=me&status=PENDING,APPROVED,REJECTED,EXECUTED,FAILED
router.get('/', requireAuth, QueryController.getQueries);

// ============ POST ROUTES ============
router.post('/', requireAuth, uploadScript.single('script'), QueryController.submit);
router.post('/:id/approve', requireAuth, requireRole(['MANAGER', 'ADMIN']), QueryController.approve);
router.post('/:id/reject', requireAuth, requireRole(['MANAGER', 'ADMIN']), QueryController.reject);

export default router;
