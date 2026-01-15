import { AppError } from './AppError';

/**
 * 400 Bad Request - Invalid input or malformed request
 * Use when: validation fails, missing required fields, invalid format
 */
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad Request') {
    super(message, 400, 'BAD_REQUEST');
  }
}
