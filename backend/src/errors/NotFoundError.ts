import { AppError } from './AppError';

/**
 * 404 Not Found - Resource does not exist
 * Use when: entity not found, invalid ID, deleted resource
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Not Found') {
    super(message, 404, 'NOT_FOUND');
  }
}
