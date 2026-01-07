import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.get('/protected', requireAuth, (req, res) => {
  res.json({ message: 'You are authenticated' });
});

export default router;
