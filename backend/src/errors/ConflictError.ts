import { AppError } from './AppError';

/**
 * 409 Conflict - Resource state conflict
 * Use when: duplicate entry, already processed, state mismatch
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Conflict') {
    super(message, 409, 'CONFLICT');
  }
}
