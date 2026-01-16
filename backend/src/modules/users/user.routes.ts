import { Router } from 'express';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware';
import { UserController } from './user.controller';
import { asyncHandler } from '../../middlewares/errorHandler.middleware';

const router = Router();

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users (Admin/Manager only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 *                   role:
 *                     type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/', requireAuth, requireRole(['ADMIN', 'MANAGER']), asyncHandler(UserController.getAll));

/**
 * @openapi
 * /api/users/profile:
 *   get:
 *     tags: [Users]
 *     summary: Get current user's profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 */
router.get('/profile', requireAuth, asyncHandler(UserController.getProfile));

/**
 * @openapi
 * /api/users/slack-id:
 *   patch:
 *     tags: [Users]
 *     summary: Update current user's Slack ID for DM notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               slackId:
 *                 type: string
 *                 description: Slack user ID (e.g., U0123456789)
 *     responses:
 *       200:
 *         description: Slack ID updated
 */
router.patch('/slack-id', requireAuth, asyncHandler(UserController.updateSlackId));

export default router;
