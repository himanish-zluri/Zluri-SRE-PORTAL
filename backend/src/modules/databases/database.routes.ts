import { Router } from 'express';
import { DatabaseController } from './database.controller';
import { requireAuth } from '../../middlewares/auth.middleware';
import { asyncHandler } from '../../middlewares/errorHandler.middleware';
import { validate, listDatabasesSchema } from '../../validation';

const router = Router();

/**
 * @openapi
 * /api/databases:
 *   get:
 *     tags: [Databases]
 *     summary: List databases for an instance
 *     description: Fetches available databases dynamically from the database instance
 *     parameters:
 *       - in: query
 *         name: instanceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Database instance ID
 *     responses:
 *       200:
 *         description: List of databases
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   database_name:
 *                     type: string
 *       400:
 *         description: Missing instanceId or connection error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Instance not found
 */
router.get('/', requireAuth, validate(listDatabasesSchema), asyncHandler(DatabaseController.listDatabases));

export default router;
