import { Router } from 'express';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware';
import { AuditController } from './audit.controller';
import { asyncHandler } from '../../middlewares/errorHandler.middleware';
import { validate, getAuditLogsSchema, auditQueryIdParamSchema } from '../../validation';

const router = Router();

// Admin only routes
router.get('/', requireAuth, requireRole(['ADMIN']), validate(getAuditLogsSchema), asyncHandler(AuditController.getAuditLogs));
router.get('/query/:queryId', requireAuth, requireRole(['ADMIN']), validate(auditQueryIdParamSchema), asyncHandler(AuditController.getAuditLogsByQuery));

export default router;
