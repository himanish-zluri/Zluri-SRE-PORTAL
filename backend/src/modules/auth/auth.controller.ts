import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';

export class AuthController {
  static async login(req: Request, res: Response) {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    
    // Set refresh token as HttpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,           // Cannot be accessed by JavaScript
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Allow cross-site in production
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'                 // Available for all routes
    });

    // Return access token and user info (no refresh token in response)
    return res.status(200).json({
      accessToken: result.accessToken,
      user: result.user
    });
  }

  static async refresh(req: Request, res: Response) {
    // Get refresh token from cookie instead of body
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token not found' });
    }

    const result = await AuthService.refresh(refreshToken);
    return res.status(200).json(result);
  }

  static async logout(req: Request, res: Response) {
    // Get refresh token from cookie
    const refreshToken = req.cookies.refreshToken;
    
    if (refreshToken) {
      await AuthService.logout(refreshToken);
    }

    // Clear the refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/'
    });

    return res.status(200).json({ message: 'Logged out successfully' });
  }

  static async logoutAll(req: AuthenticatedRequest, res: Response) {
    await AuthService.logoutAll(req.user!.id);
    
    // Clear the refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/'
    });

    return res.status(200).json({ message: 'Logged out from all devices' });
  }
}
