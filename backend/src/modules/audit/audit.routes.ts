import { Router } from 'express';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware';
import { AuditController } from './audit.controller';
import { asyncHandler } from '../../middlewares/errorHandler.middleware';
import { validate, getAuditLogsSchema, auditQueryIdParamSchema } from '../../validation';

const router = Router();

/**
 * @openapi
 * /api/audit:
 *   get:
 *     tags: [Audit]
 *     summary: Get audit logs (Admin only)
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           maximum: 100
 *           default: 100
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: queryId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by query request ID
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by user ID
 *       - in: query
 *         name: instanceId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by database instance ID
 *       - in: query
 *         name: databaseName
 *         schema:
 *           type: string
 *         description: Filter by database name
 *     responses:
 *       200:
 *         description: List of audit logs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AuditLog'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires ADMIN role
 */
router.get('/', requireAuth, requireRole(['ADMIN']), validate(getAuditLogsSchema), asyncHandler(AuditController.getAuditLogs));

/**
 * @openapi
 * /api/audit/query/{queryId}:
 *   get:
 *     tags: [Audit]
 *     summary: Get audit logs for a specific query (Admin only)
 *     parameters:
 *       - in: path
 *         name: queryId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Audit logs for the query
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AuditLog'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires ADMIN role
 */
router.get('/query/:queryId', requireAuth, requireRole(['ADMIN']), validate(auditQueryIdParamSchema), asyncHandler(AuditController.getAuditLogsByQuery));

export default router;
