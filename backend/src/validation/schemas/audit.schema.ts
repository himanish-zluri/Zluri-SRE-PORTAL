import { z } from 'zod';

const MAX_LIMIT = 100;

export const getAuditLogsSchema = z.object({
  query: z.object({
    limit: z.string()
      .regex(/^\d+$/, 'Limit must be a positive integer')
      .refine((val) => parseInt(val, 10) <= MAX_LIMIT, `Limit cannot exceed ${MAX_LIMIT}`)
      .optional(),
    offset: z.string().regex(/^\d+$/, 'Offset must be a positive integer').optional(),
    queryId: z.string().uuid('Invalid query ID').optional(),
    userId: z.string().uuid('Invalid user ID').optional(),
    databaseName: z.string().optional(),
  }),
});

export const auditQueryIdParamSchema = z.object({
  params: z.object({
    queryId: z.string().uuid('Invalid query ID'),
  }),
});

export type GetAuditLogsQuery = z.infer<typeof getAuditLogsSchema>['query'];
export type AuditQueryIdParam = z.infer<typeof auditQueryIdParamSchema>['params'];
