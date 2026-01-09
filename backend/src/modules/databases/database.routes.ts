import { Router } from 'express';
import { DatabaseController } from './database.controller';
import { requireAuth } from '../../middlewares/auth.middleware';

const router = Router();

// GET /api/databases?instanceId=xxx
router.get('/', requireAuth, DatabaseController.listDatabases);

export default router;
