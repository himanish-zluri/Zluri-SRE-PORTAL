import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { QueryController } from './query.controller';

const router = Router();

// POST /api/queries
router.post('/', requireAuth, QueryController.submit);

export default router;
