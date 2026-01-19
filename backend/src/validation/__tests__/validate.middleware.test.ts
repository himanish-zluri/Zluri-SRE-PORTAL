import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { validate } from '../../validation/validate.middleware';

const mockRequest = (overrides = {}): Partial<Request> => ({
  body: {},
  query: {},
  params: {},
  ...overrides,
});

const mockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Validate Middleware', () => {
  describe('validate', () => {
    it('should call next() when validation passes', async () => {
      const schema = z.object({
        body: z.object({
          email: z.string().email(),
        }),
      });

      const req = mockRequest({ body: { email: 'test@example.com' } }) as Request;
      const res = mockResponse() as Response;
      const next = jest.fn();

      await validate(schema)(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should call next with ZodError when body validation fails', async () => {
      const schema = z.object({
        body: z.object({
          email: z.string().email(),
        }),
      });

      const req = mockRequest({ body: { email: 'invalid' } }) as Request;
      const res = mockResponse() as Response;
      const next = jest.fn();

      await validate(schema)(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ZodError));
    });

    it('should validate query params', async () => {
      const schema = z.object({
        query: z.object({
          limit: z.string().regex(/^\d+$/),
        }),
      });

      const req = mockRequest({ query: { limit: '10' } }) as Request;
      const res = mockResponse() as Response;
      const next = jest.fn();

      await validate(schema)(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should call next with ZodError when query validation fails', async () => {
      const schema = z.object({
        query: z.object({
          limit: z.string().regex(/^\d+$/),
        }),
      });

      const req = mockRequest({ query: { limit: 'abc' } }) as Request;
      const res = mockResponse() as Response;
      const next = jest.fn();

      await validate(schema)(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ZodError));
    });

    it('should validate route params', async () => {
      const schema = z.object({
        params: z.object({
          id: z.string().uuid(),
        }),
      });

      const req = mockRequest({ params: { id: '550e8400-e29b-41d4-a716-446655440000' } }) as Request;
      const res = mockResponse() as Response;
      const next = jest.fn();

      await validate(schema)(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should call next with ZodError when params validation fails', async () => {
      const schema = z.object({
        params: z.object({
          id: z.string().uuid(),
        }),
      });

      const req = mockRequest({ params: { id: 'not-a-uuid' } }) as Request;
      const res = mockResponse() as Response;
      const next = jest.fn();

      await validate(schema)(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ZodError));
    });

    it('should validate body, query, and params together', async () => {
      const schema = z.object({
        body: z.object({
          name: z.string().min(1),
        }),
        query: z.object({
          type: z.enum(['A', 'B']),
        }),
        params: z.object({
          id: z.string().uuid(),
        }),
      });

      const req = mockRequest({
        body: { name: 'Test' },
        query: { type: 'A' },
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
      }) as Request;
      const res = mockResponse() as Response;
      const next = jest.fn();

      await validate(schema)(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should handle optional fields', async () => {
      const schema = z.object({
        body: z.object({
          required: z.string(),
          optional: z.string().optional(),
        }),
      });

      const req = mockRequest({ body: { required: 'value' } }) as Request;
      const res = mockResponse() as Response;
      const next = jest.fn();

      await validate(schema)(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });
});
