import { Router } from 'express';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware';
import { QueryController } from './query.controller';
import { uploadScript, validateScriptContent } from '../../middlewares/upload.middleware';
import { asyncHandler } from '../../middlewares/errorHandler.middleware';
import { validate, submitQuerySchema, queryIdParamSchema, rejectQuerySchema, getQueriesSchema } from '../../validation';

const router = Router();

/**
 * @openapi
 * /api/queries:
 *   get:
 *     tags: [Queries]
 *     summary: Get queries for approval (Manager/Admin only)
 *     description: Returns queries submitted to the manager's pods or all queries for admin
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status (comma-separated, e.g., PENDING,EXECUTED)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [POSTGRES, MONGODB]
 *         description: Filter by database type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           maximum: 100
 *           default: 20
 *         description: Number of results (max 100)
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: List of queries
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/QueryRequest'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires MANAGER or ADMIN role
 */
router.get('/', requireAuth, requireRole(['MANAGER', 'ADMIN']), validate(getQueriesSchema), asyncHandler(QueryController.getQueries));

/**
 * @openapi
 * /api/queries/my-submissions:
 *   get:
 *     tags: [Queries]
 *     summary: Get user's own submitted queries
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status (comma-separated)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [POSTGRES, MONGODB]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of user's queries
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/QueryRequest'
 *       401:
 *         description: Unauthorized
 */
router.get('/my-submissions', requireAuth, validate(getQueriesSchema), asyncHandler(QueryController.getMySubmissions));

/**
 * @openapi
 * /api/queries:
 *   post:
 *     tags: [Queries]
 *     summary: Submit a new query request
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [instanceId, databaseName, podId, submissionType]
 *             properties:
 *               instanceId:
 *                 type: string
 *                 format: uuid
 *               databaseName:
 *                 type: string
 *               queryText:
 *                 type: string
 *                 description: Required for QUERY type
 *               podId:
 *                 type: string
 *               comments:
 *                 type: string
 *               submissionType:
 *                 type: string
 *                 enum: [QUERY, SCRIPT]
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               instanceId:
 *                 type: string
 *               databaseName:
 *                 type: string
 *               podId:
 *                 type: string
 *               comments:
 *                 type: string
 *               submissionType:
 *                 type: string
 *                 enum: [SCRIPT]
 *               script:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Query submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QueryRequest'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', requireAuth, uploadScript.single('script'), validateScriptContent, validate(submitQuerySchema), asyncHandler(QueryController.submit));

/**
 * @openapi
 * /api/queries/{id}/approve:
 *   post:
 *     tags: [Queries]
 *     summary: Approve and execute a query (Manager/Admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Query request ID
 *     responses:
 *       200:
 *         description: Query executed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: EXECUTED
 *                 result:
 *                   type: object
 *       400:
 *         description: Query already processed or execution error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Query not found
 */
router.post('/:id/approve', requireAuth, requireRole(['MANAGER', 'ADMIN']), validate(queryIdParamSchema), asyncHandler(QueryController.approve));

/**
 * @openapi
 * /api/queries/{id}/reject:
 *   post:
 *     tags: [Queries]
 *     summary: Reject a query (Manager/Admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Rejection reason
 *     responses:
 *       200:
 *         description: Query rejected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QueryRequest'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Query not found
 */
router.post('/:id/reject', requireAuth, requireRole(['MANAGER', 'ADMIN']), validate(rejectQuerySchema), asyncHandler(QueryController.reject));

export default router;
