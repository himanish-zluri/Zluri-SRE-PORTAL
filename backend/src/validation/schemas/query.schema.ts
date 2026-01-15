import { z } from 'zod';

export const submitQuerySchema = z.object({
  body: z.object({
    instanceId: z.string().uuid('Invalid instance ID'),
    databaseName: z.string().min(1, 'Database name is required'),
    queryText: z.string().optional(),
    podId: z.string().min(1, 'Pod ID is required'),
    comments: z.string().optional(),
    submissionType: z.enum(['QUERY', 'SCRIPT'], {
      message: 'Submission type must be QUERY or SCRIPT',
    }),
  }),
});

export const queryIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid query ID'),
  }),
});

export const rejectQuerySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid query ID'),
  }),
  body: z.object({
    reason: z.string().optional(),
  }),
});

export const getQueriesSchema = z.object({
  query: z.object({
    status: z.string().optional(),
    type: z.enum(['QUERY', 'SCRIPT']).optional(),
    limit: z.string()
      .regex(/^\d+$/, 'Limit must be a positive integer')
      .refine((val) => parseInt(val, 10) <= 100, 'Limit cannot exceed 100')
      .optional(),
    offset: z.string().regex(/^\d+$/, 'Offset must be a positive integer').optional(),
  }),
});

export type SubmitQueryInput = z.infer<typeof submitQuerySchema>['body'];
export type QueryIdParam = z.infer<typeof queryIdParamSchema>['params'];
export type GetQueriesQuery = z.infer<typeof getQueriesSchema>['query'];
