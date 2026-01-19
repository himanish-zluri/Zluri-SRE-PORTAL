import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { getRequestStats } from '../middlewares/security.middleware';

const router = Router();

/**
 * @openapi
 * /api/security/stats:
 *   get:
 *     tags: [Security]
 *     summary: Get security statistics (Admin only)
 *     description: Returns request statistics and security monitoring data
 *     responses:
 *       200:
 *         description: Security statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 totalUniqueIPs:
 *                   type: number
 *                 topRequesters:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       ip:
 *                         type: string
 *                       requests:
 *                         type: number
 *                       duration:
 *                         type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires ADMIN role
 */
router.get('/stats', requireAuth, requireRole(['ADMIN']), (req, res) => {
  const stats = getRequestStats();
  res.json({
    message: 'Security statistics',
    timestamp: new Date().toISOString(),
    ...stats
  });
});

export default router;