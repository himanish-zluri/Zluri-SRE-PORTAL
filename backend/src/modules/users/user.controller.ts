import { Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { UserRepository } from './user.repository';

export class UserController {
  static async getAll(req: AuthenticatedRequest, res: Response) {
    const users = await UserRepository.findAll();
    
    // Return only safe fields (no password hash)
    const safeUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    }));
    
    res.json(safeUsers);
  }

  /**
   * Update current user's Slack ID for DM notifications
   */
  static async updateSlackId(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.id;
    const { slackId } = req.body;

    await UserRepository.updateSlackId(userId, slackId || null);
    
    res.json({ message: 'Slack ID updated successfully' });
  }

  /**
   * Get current user's profile including Slack ID
   */
  static async getProfile(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.id;
    const user = await UserRepository.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      slackId: user.slackId,
    });
  }
}
