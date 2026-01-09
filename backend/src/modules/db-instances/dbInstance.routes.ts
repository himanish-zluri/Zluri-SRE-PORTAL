import { Router } from 'express';
import { DbInstanceController } from './dbInstance.controller';
import { requireAuth } from '../../middlewares/auth.middleware';

const router = Router();

// GET /api/instance?type=POSTGRES
router.get('/instance', requireAuth, DbInstanceController.listInstances);

// GET /api/database?instanceId=xxx
router.get('/database', requireAuth, DbInstanceController.listDatabases);

export default router;
