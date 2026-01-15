import { Router } from 'express';
import { PodsController } from './pods.controller';
import { requireAuth } from '../../middlewares/auth.middleware';
import { asyncHandler } from '../../middlewares/errorHandler.middleware';
import { validate, podIdParamSchema } from '../../validation';

const router = Router();

// GET /api/pods
router.get('/', requireAuth, asyncHandler(PodsController.listPods));

// GET /api/pods/:id
router.get('/:id', requireAuth, validate(podIdParamSchema), asyncHandler(PodsController.getPod));

export default router;
