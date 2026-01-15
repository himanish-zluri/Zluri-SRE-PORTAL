import { Router } from 'express';
import { AuthController } from './auth.controller';
import { requireAuth } from '../../middlewares/auth.middleware';
import { validate, loginSchema, refreshSchema, logoutSchema } from '../../validation';
import { asyncHandler } from '../../middlewares/errorHandler.middleware';

const router = Router();

router.post('/login', validate(loginSchema), asyncHandler(AuthController.login));
router.post('/refresh', validate(refreshSchema), asyncHandler(AuthController.refresh));
router.post('/logout', validate(logoutSchema), asyncHandler(AuthController.logout));
router.post('/logout-all', requireAuth, asyncHandler(AuthController.logoutAll));

export default router;
