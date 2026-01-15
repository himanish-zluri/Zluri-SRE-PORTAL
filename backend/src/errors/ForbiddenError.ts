import { AppError } from './AppError';

/**
 * 403 Forbidden - Authenticated but not authorized
 * Use when: user lacks permission, role restriction, resource access denied
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}
