import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { QueryController } from './query.controller';
import { requireManager } from '../../middlewares/auth.middleware';

const router = Router();

// POST /api/queries
router.post('/', requireAuth, QueryController.submit);

router.get(
    '/pending',
    requireAuth,
    requireManager,
    QueryController.getPendingForManager
  );
  
  router.post(
    '/:id/approve',
    requireAuth,
    requireManager,
    QueryController.approve
  );
  
  router.post(
    '/:id/reject',
    requireAuth,
    requireManager,
    QueryController.reject
  );

  router.get(
    '/mine',
    requireAuth,
    QueryController.getMyQueries
  );
  
  

export default router;
