import { AppError } from './AppError';

/**
 * 401 Unauthorized - Authentication required or failed
 * Use when: missing token, invalid token, expired token
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}
