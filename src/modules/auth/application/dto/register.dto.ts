import { z } from 'zod';

export const registerSchema = z.object({
  municipalityId: z.string().uuid('Invalid municipality ID'),
  cpf: z.string().regex(/^\d{11}$|^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'Invalid CPF'),
  name: z.string().min(2, 'Name must have at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must have at least 6 characters'),
  phone: z.string().optional(),
  role: z
    .enum(['MANAGER', 'DRIVER', 'LEADER', 'STUDENT', 'RIDE_SHARE'])
    .optional()
    .default('STUDENT'),
  priorityLevel: z.number().int().min(1).max(3).optional(), // 1: Titular, 2: Univ. Caronista, 3: Caronista Comum
  defaultRouteId: z.string().uuid().optional(),
  needsWheelchair: z.boolean().optional().default(false),
  photoUrl: z.string().url().optional(),
  gradeFileUrl: z.string().url().optional(),
  residenciaFileUrl: z.string().url().optional(),
});

export type RegisterDto = z.infer<typeof registerSchema>;
