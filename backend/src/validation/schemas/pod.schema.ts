import { z } from 'zod';

export const podIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Pod ID is required'),
  }),
});

export type PodIdParam = z.infer<typeof podIdParamSchema>['params'];
