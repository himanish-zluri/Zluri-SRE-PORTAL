import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';

export class AuthController {
  static async login(req: Request, res: Response) {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    return res.status(200).json(result);
  }

  static async refresh(req: Request, res: Response) {
    const { refreshToken } = req.body;
    const result = await AuthService.refresh(refreshToken);
    return res.status(200).json(result);
  }

  static async logout(req: Request, res: Response) {
    const { refreshToken } = req.body;
    await AuthService.logout(refreshToken);
    return res.status(200).json({ message: 'Logged out successfully' });
  }

  static async logoutAll(req: AuthenticatedRequest, res: Response) {
    await AuthService.logoutAll(req.user!.id);
    return res.status(200).json({ message: 'Logged out from all devices' });
  }
}
