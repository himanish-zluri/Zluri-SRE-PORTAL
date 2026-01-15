import { AppError } from './AppError';

/**
 * 500 Internal Server Error - Unexpected server error
 * Use when: database failure, external service error, unexpected exception
 */
export class InternalError extends AppError {
  constructor(message: string = 'Internal Server Error') {
    super(message, 500, 'INTERNAL_ERROR');
  }
}
