import { Router } from 'express';
import { DbInstanceController } from './dbInstance.controller';
import { requireAuth } from '../../middlewares/auth.middleware';
import { asyncHandler } from '../../middlewares/errorHandler.middleware';
import { validate, listInstancesSchema } from '../../validation';

const router = Router();

// GET /api/instances?type=POSTGRES
router.get('/', requireAuth, validate(listInstancesSchema), asyncHandler(DbInstanceController.listInstances));

export default router;
