import { Router } from 'express';
import { DbInstanceController } from './dbInstance.controller';
import { requireAuth } from '../../middlewares/auth.middleware';

const router = Router();

router.get(
  '/:instanceId/databases',
  requireAuth,
  DbInstanceController.listDatabases
);

export default router;
