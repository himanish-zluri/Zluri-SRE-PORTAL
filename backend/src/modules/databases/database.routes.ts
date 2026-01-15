import { Router } from 'express';
import { DatabaseController } from './database.controller';
import { requireAuth } from '../../middlewares/auth.middleware';
import { asyncHandler } from '../../middlewares/errorHandler.middleware';
import { validate, listDatabasesSchema } from '../../validation';

const router = Router();

// GET /api/databases?instanceId=xxx
router.get('/', requireAuth, validate(listDatabasesSchema), asyncHandler(DatabaseController.listDatabases));

export default router;
