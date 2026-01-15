import { z } from 'zod';

export const getAuditLogsSchema = z.object({
  query: z.object({
    limit: z.string().regex(/^\d+$/, 'Limit must be a number').optional(),
    offset: z.string().regex(/^\d+$/, 'Offset must be a number').optional(),
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
