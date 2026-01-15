import { z } from 'zod';

export const podIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid pod ID'),
  }),
});

export type PodIdParam = z.infer<typeof podIdParamSchema>['params'];
