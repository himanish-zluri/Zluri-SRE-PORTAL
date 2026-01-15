import { z } from 'zod';

export const listDatabasesSchema = z.object({
  query: z.object({
    instanceId: z.string().uuid('Invalid instance ID'),
  }),
});

export type ListDatabasesQuery = z.infer<typeof listDatabasesSchema>['query'];
