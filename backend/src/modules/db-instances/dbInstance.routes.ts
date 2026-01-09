import { Router } from 'express';
import { DbInstanceController } from './dbInstance.controller';
import { requireAuth } from '../../middlewares/auth.middleware';

const router = Router();

// GET /api/instances?type=POSTGRES
router.get('/', requireAuth, DbInstanceController.listInstances);

export default router;
