import { z } from 'zod';

export const listInstancesSchema = z.object({
  query: z.object({
    type: z.enum(['POSTGRES', 'MONGODB']).optional(),
  }),
});

export type ListInstancesQuery = z.infer<typeof listInstancesSchema>['query'];
