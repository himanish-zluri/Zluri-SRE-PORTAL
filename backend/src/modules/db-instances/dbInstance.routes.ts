import { Router } from 'express';
import { DbInstanceController } from './dbInstance.controller';
import { requireAuth } from '../../middlewares/auth.middleware';
import { asyncHandler } from '../../middlewares/errorHandler.middleware';
import { validate, listInstancesSchema } from '../../validation';

const router = Router();

/**
 * @openapi
 * /api/instances:
 *   get:
 *     tags: [Instances]
 *     summary: List database instances
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [POSTGRES, MONGODB]
 *         description: Filter by database type
 *     responses:
 *       200:
 *         description: List of database instances
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DbInstance'
 *       401:
 *         description: Unauthorized
 */
router.get('/', requireAuth, validate(listInstancesSchema), asyncHandler(DbInstanceController.listInstances));

export default router;
