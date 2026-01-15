import { Router } from 'express';
import { PodsController } from './pods.controller';
import { requireAuth } from '../../middlewares/auth.middleware';
import { asyncHandler } from '../../middlewares/errorHandler.middleware';
import { validate, podIdParamSchema } from '../../validation';

const router = Router();

/**
 * @openapi
 * /api/pods:
 *   get:
 *     tags: [Pods]
 *     summary: List all pods
 *     responses:
 *       200:
 *         description: List of pods
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Pod'
 *       401:
 *         description: Unauthorized
 */
router.get('/', requireAuth, asyncHandler(PodsController.listPods));

/**
 * @openapi
 * /api/pods/{id}:
 *   get:
 *     tags: [Pods]
 *     summary: Get pod by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pod details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Pod'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Pod not found
 */
router.get('/:id', requireAuth, validate(podIdParamSchema), asyncHandler(PodsController.getPod));

export default router;
