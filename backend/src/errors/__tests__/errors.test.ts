import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  InternalError
} from '../../errors';

describe('Custom Error Classes', () => {
  describe('AppError', () => {
    it('should create error with default values', () => {
      const error = new AppError('Something went wrong');

      expect(error.message).toBe('Something went wrong');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('AppError');
      expect(error).toBeInstanceOf(Error);
    });

    it('should create error with custom values', () => {
      const error = new AppError('Custom error', 418, 'TEAPOT');

      expect(error.message).toBe('Custom error');
      expect(error.statusCode).toBe(418);
      expect(error.code).toBe('TEAPOT');
    });

    it('should have stack trace', () => {
      const error = new AppError('Test error');
      expect(error.stack).toBeDefined();
    });
  });

  describe('BadRequestError', () => {
    it('should create 400 error with default message', () => {
      const error = new BadRequestError();

      expect(error.message).toBe('Bad Request');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('BAD_REQUEST');
      expect(error.name).toBe('BadRequestError');
    });

    it('should create 400 error with custom message', () => {
      const error = new BadRequestError('Invalid input');

      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
    });
  });

  describe('UnauthorizedError', () => {
    it('should create 401 error with default message', () => {
      const error = new UnauthorizedError();

      expect(error.message).toBe('Unauthorized');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.name).toBe('UnauthorizedError');
    });

    it('should create 401 error with custom message', () => {
      const error = new UnauthorizedError('Invalid token');

      expect(error.message).toBe('Invalid token');
      expect(error.statusCode).toBe(401);
    });
  });

  describe('ForbiddenError', () => {
    it('should create 403 error with default message', () => {
      const error = new ForbiddenError();

      expect(error.message).toBe('Forbidden');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
      expect(error.name).toBe('ForbiddenError');
    });

    it('should create 403 error with custom message', () => {
      const error = new ForbiddenError('Admin access required');

      expect(error.message).toBe('Admin access required');
      expect(error.statusCode).toBe(403);
    });
  });

  describe('NotFoundError', () => {
    it('should create 404 error with default message', () => {
      const error = new NotFoundError();

      expect(error.message).toBe('Not Found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.name).toBe('NotFoundError');
    });

    it('should create 404 error with custom message', () => {
      const error = new NotFoundError('Query not found');

      expect(error.message).toBe('Query not found');
      expect(error.statusCode).toBe(404);
    });
  });

  describe('ConflictError', () => {
    it('should create 409 error with default message', () => {
      const error = new ConflictError();

      expect(error.message).toBe('Conflict');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
      expect(error.name).toBe('ConflictError');
    });

    it('should create 409 error with custom message', () => {
      const error = new ConflictError('Query already processed');

      expect(error.message).toBe('Query already processed');
      expect(error.statusCode).toBe(409);
    });
  });

  describe('ValidationError', () => {
    it('should create 400 error with default message', () => {
      const error = new ValidationError();

      expect(error.message).toBe('Validation Error');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.name).toBe('ValidationError');
      expect(error.errors).toEqual([]);
    });

    it('should create error with field errors', () => {
      const fieldErrors = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'password', message: 'Password too short' }
      ];
      const error = new ValidationError('Validation failed', fieldErrors);

      expect(error.message).toBe('Validation failed');
      expect(error.errors).toEqual(fieldErrors);
      expect(error.errors).toHaveLength(2);
    });
  });

  describe('InternalError', () => {
    it('should create 500 error with default message', () => {
      const error = new InternalError();

      expect(error.message).toBe('Internal Server Error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.name).toBe('InternalError');
    });

    it('should create 500 error with custom message', () => {
      const error = new InternalError('Database connection failed');

      expect(error.message).toBe('Database connection failed');
      expect(error.statusCode).toBe(500);
    });
  });

  describe('Error inheritance', () => {
    it('all errors should be instances of AppError', () => {
      expect(new BadRequestError()).toBeInstanceOf(AppError);
      expect(new UnauthorizedError()).toBeInstanceOf(AppError);
      expect(new ForbiddenError()).toBeInstanceOf(AppError);
      expect(new NotFoundError()).toBeInstanceOf(AppError);
      expect(new ConflictError()).toBeInstanceOf(AppError);
      expect(new ValidationError()).toBeInstanceOf(AppError);
      expect(new InternalError()).toBeInstanceOf(AppError);
    });

    it('all errors should be instances of Error', () => {
      expect(new BadRequestError()).toBeInstanceOf(Error);
      expect(new UnauthorizedError()).toBeInstanceOf(Error);
      expect(new ForbiddenError()).toBeInstanceOf(Error);
      expect(new NotFoundError()).toBeInstanceOf(Error);
      expect(new ConflictError()).toBeInstanceOf(Error);
      expect(new ValidationError()).toBeInstanceOf(Error);
      expect(new InternalError()).toBeInstanceOf(Error);
    });
  });
});
