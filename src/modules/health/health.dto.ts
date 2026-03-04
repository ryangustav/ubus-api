import { z } from 'zod';

/** Query params para simulação de carga - validação com Zod */
export const HealthQuerySchema = z.object({
  /** Número de iterações (Redis + DB) por request. Default: 1. Máx: 100 */
  iterations: z.coerce.number().int().min(1).max(100).default(1),
  /** Delay em ms entre iterações. Default: 0 */
  delayMs: z.coerce.number().int().min(0).max(5000).default(0),
});

export type HealthQueryDto = z.infer<typeof HealthQuerySchema>;
