import { AppError } from './AppError';

export interface FieldError {
  field: string;
  message: string;
}

/**
 * 400 Validation Error - Input validation failed
 * Use when: Zod validation fails, schema mismatch, field-level errors
 */
export class ValidationError extends AppError {
  public readonly errors: FieldError[];

  constructor(message: string = 'Validation Error', errors: FieldError[] = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}
