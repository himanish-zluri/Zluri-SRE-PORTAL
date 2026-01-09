import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          message: 'Email and password are required'
        });
      }

      const result = await AuthService.login(email, password);

      return res.status(200).json(result);
    } catch (error) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }
  }

  static async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          message: 'Refresh token is required'
        });
      }

      const result = await AuthService.refresh(refreshToken);

      return res.status(200).json(result);
    } catch (error) {
      return res.status(401).json({
        message: 'Invalid or expired refresh token'
      });
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          message: 'Refresh token is required'
        });
      }

      await AuthService.logout(refreshToken);

      return res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
      return res.status(500).json({
        message: 'Failed to logout'
      });
    }
  }

  static async logoutAll(req: AuthenticatedRequest, res: Response) {
    try {
      await AuthService.logoutAll(req.user!.id);

      return res.status(200).json({ message: 'Logged out from all devices' });
    } catch (error) {
      return res.status(500).json({
        message: 'Failed to logout'
      });
    }
  }
}
