import { Router } from 'express';
import { PodsController } from './pods.controller';
import { requireAuth } from '../../middlewares/auth.middleware';

const router = Router();

// GET /api/pods
router.get('/', requireAuth, PodsController.listPods);

// GET /api/pods/:id
router.get('/:id', requireAuth, PodsController.getPod);

export default router;
