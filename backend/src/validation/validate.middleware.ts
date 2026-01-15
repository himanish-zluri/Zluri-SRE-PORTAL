import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

/**
 * Validation middleware factory
 * Validates request body, query params, and route params against a Zod schema
 * Throws ZodError on validation failure (caught by global error handler)
 */
export function validate(schema: z.ZodType) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      // Let the global error handler handle ZodError
      next(error);
    }
  };
}
