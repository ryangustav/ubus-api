import { z } from 'zod';

export const HealthQuerySchema = z.object({
  iterations: z.coerce.number().min(1).max(100).default(1),
  delayMs: z.coerce.number().min(0).max(5000).default(0),
});

export type HealthQueryDto = z.infer<typeof HealthQuerySchema>;
