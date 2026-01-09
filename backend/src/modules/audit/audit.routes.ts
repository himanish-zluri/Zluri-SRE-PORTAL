import { Router } from 'express';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware';
import { AuditController } from './audit.controller';

const router = Router();

// Admin only routes
router.get('/', requireAuth, requireRole(['ADMIN']), AuditController.getAuditLogs);
router.get('/query/:queryId', requireAuth, requireRole(['ADMIN']), AuditController.getAuditLogsByQuery);

export default router;
