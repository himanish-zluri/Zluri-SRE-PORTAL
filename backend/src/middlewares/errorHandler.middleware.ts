import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, ValidationError } from '../errors';

interface ErrorResponse {
  status: 'error';
  code: string;
  message: string;
  errors?: Array<{ field: string; message: string }>;
  stack?: string;
}

/**
 * Global error handler middleware
 * Catches all errors and returns consistent JSON responses
 */
export function globalErrorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error for debugging (in production, use proper logging)
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[ERROR] ${err.name}: ${err.message}`);
    if (process.env.NODE_ENV === 'development') {
      console.error(err.stack);
    }
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const fieldErrors = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    const response: ErrorResponse = {
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      errors: fieldErrors,
    };

    if (process.env.NODE_ENV === 'development') {
      response.stack = err.stack;
    }

    res.status(400).json(response);
    return;
  }

  // Handle our custom AppError and subclasses
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      status: 'error',
      code: err.code,
      message: err.message,
    };

    // Include field errors for ValidationError
    if (err instanceof ValidationError && err.errors.length > 0) {
      response.errors = err.errors;
    }

    // Include stack trace in development
    if (process.env.NODE_ENV === 'development') {
      response.stack = err.stack;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle unknown errors (programming errors, unexpected exceptions)
  const response: ErrorResponse = {
    status: 'error',
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal Server Error' 
      : err.message || 'Internal Server Error',
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(500).json(response);
}

/**
 * Async handler wrapper to catch errors in async route handlers
 * Eliminates need for try/catch in every controller
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 Not Found handler for undefined routes
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  const { NotFoundError } = require('../errors');
  next(new NotFoundError(`Route ${req.method} ${req.path} not found`));
}
