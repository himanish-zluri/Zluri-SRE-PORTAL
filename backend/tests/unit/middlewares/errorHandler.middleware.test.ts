import { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';
import {
  globalErrorHandler,
  asyncHandler,
  notFoundHandler,
} from '../../../src/middlewares/errorHandler.middleware';
import {
  AppError,
  BadRequestError,
  NotFoundError,
  ValidationError,
} from '../../../src/errors';

// Mock request, response, and next function
const mockRequest = (overrides = {}): Partial<Request> => ({
  method: 'GET',
  path: '/test',
  ...overrides,
});

const mockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext: NextFunction = jest.fn();

describe('Error Handler Middleware', () => {
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('globalErrorHandler', () => {
    it('should handle AppError with correct status code and response', () => {
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const error = new AppError('Custom error', 418, 'TEAPOT');

      globalErrorHandler(error, req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(418);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        code: 'TEAPOT',
        message: 'Custom error',
      });
    });

    it('should handle BadRequestError', () => {
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const error = new BadRequestError('Invalid input');

      globalErrorHandler(error, req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        code: 'BAD_REQUEST',
        message: 'Invalid input',
      });
    });

    it('should handle NotFoundError', () => {
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const error = new NotFoundError('Resource not found');

      globalErrorHandler(error, req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        code: 'NOT_FOUND',
        message: 'Resource not found',
      });
    });

    it('should handle ValidationError with field errors', () => {
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const fieldErrors = [
        { field: 'email', message: 'Invalid email' },
        { field: 'password', message: 'Too short' },
      ];
      const error = new ValidationError('Validation failed', fieldErrors);

      globalErrorHandler(error, req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors: fieldErrors,
      });
    });

    it('should not include errors array for ValidationError with empty errors', () => {
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const error = new ValidationError('Validation failed', []);

      globalErrorHandler(error, req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
      });
    });

    it('should handle unknown errors with 500 status', () => {
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const error = new Error('Something unexpected');

      globalErrorHandler(error, req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Something unexpected',
      });
    });

    it('should hide error message in production for unknown errors', () => {
      process.env.NODE_ENV = 'production';
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const error = new Error('Sensitive database error');

      globalErrorHandler(error, req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Internal Server Error',
      });
    });

    it('should include stack trace in development for AppError', () => {
      process.env.NODE_ENV = 'development';
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const error = new BadRequestError('Test error');

      globalErrorHandler(error, req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.stack).toBeDefined();
    });

    it('should include stack trace in development for unknown errors', () => {
      process.env.NODE_ENV = 'development';
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const error = new Error('Unknown error');

      globalErrorHandler(error, req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.stack).toBeDefined();
    });

    it('should not include stack trace in production', () => {
      process.env.NODE_ENV = 'production';
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const error = new BadRequestError('Test error');

      globalErrorHandler(error, req, res, mockNext);

      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.stack).toBeUndefined();
    });

    it('should log errors in non-test environment', () => {
      process.env.NODE_ENV = 'development';
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const error = new BadRequestError('Test error');

      globalErrorHandler(error, req, res, mockNext);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    describe('ZodError handling', () => {
      it('should handle ZodError with 400 status', () => {
        const req = mockRequest() as Request;
        const res = mockResponse() as Response;
        const schema = z.object({
          email: z.string().email(),
          age: z.number().min(18),
        });

        let zodError: ZodError;
        try {
          schema.parse({ email: 'invalid', age: 10 });
        } catch (e) {
          zodError = e as ZodError;
        }

        globalErrorHandler(zodError!, req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(400);
        const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
        expect(jsonCall.status).toBe('error');
        expect(jsonCall.code).toBe('VALIDATION_ERROR');
        expect(jsonCall.message).toBe('Validation failed');
        expect(jsonCall.errors).toBeDefined();
        expect(jsonCall.errors.length).toBe(2);
      });

      it('should format ZodError field paths correctly', () => {
        const req = mockRequest() as Request;
        const res = mockResponse() as Response;
        const schema = z.object({
          user: z.object({
            profile: z.object({
              name: z.string().min(1),
            }),
          }),
        });

        let zodError: ZodError;
        try {
          schema.parse({ user: { profile: { name: '' } } });
        } catch (e) {
          zodError = e as ZodError;
        }

        globalErrorHandler(zodError!, req, res, mockNext);

        const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
        expect(jsonCall.errors[0].field).toBe('user.profile.name');
      });

      it('should include stack trace for ZodError in development', () => {
        process.env.NODE_ENV = 'development';
        const req = mockRequest() as Request;
        const res = mockResponse() as Response;
        const schema = z.string();

        let zodError: ZodError;
        try {
          schema.parse(123);
        } catch (e) {
          zodError = e as ZodError;
        }

        globalErrorHandler(zodError!, req, res, mockNext);

        const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
        expect(jsonCall.stack).toBeDefined();
      });

      it('should not include stack trace for ZodError in production', () => {
        process.env.NODE_ENV = 'production';
        const req = mockRequest() as Request;
        const res = mockResponse() as Response;
        const schema = z.string();

        let zodError: ZodError;
        try {
          schema.parse(123);
        } catch (e) {
          zodError = e as ZodError;
        }

        globalErrorHandler(zodError!, req, res, mockNext);

        const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
        expect(jsonCall.stack).toBeUndefined();
      });
    });
  });

  describe('asyncHandler', () => {
    it('should pass successful async function result', async () => {
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const next = jest.fn();

      const asyncFn = jest.fn().mockResolvedValue('success');
      const wrapped = asyncHandler(asyncFn);

      await wrapped(req, res, next);

      expect(asyncFn).toHaveBeenCalledWith(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });

    it('should catch async errors and pass to next', async () => {
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const next = jest.fn();

      const error = new BadRequestError('Async error');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const wrapped = asyncHandler(asyncFn);

      await wrapped(req, res, next);

      // Wait for promise to resolve
      await new Promise(resolve => setImmediate(resolve));

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should handle sync functions that return promises', async () => {
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const next = jest.fn();

      const asyncFn = (req: Request, res: Response) => {
        return Promise.resolve(res.json({ success: true }));
      };
      const wrapped = asyncHandler(asyncFn);

      await wrapped(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('notFoundHandler', () => {
    it('should call next with NotFoundError for undefined routes', () => {
      const req = mockRequest({ method: 'GET', path: '/unknown' }) as Request;
      const res = mockResponse() as Response;
      const next = jest.fn();

      notFoundHandler(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
      const error = next.mock.calls[0][0];
      expect(error.message).toBe('Route GET /unknown not found');
      expect(error.statusCode).toBe(404);
    });

    it('should include correct method and path in error message', () => {
      const req = mockRequest({ method: 'POST', path: '/api/missing' }) as Request;
      const res = mockResponse() as Response;
      const next = jest.fn();

      notFoundHandler(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.message).toBe('Route POST /api/missing not found');
    });
  });
});
