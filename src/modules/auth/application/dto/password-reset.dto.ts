import { z } from 'zod';

export const passwordRedefinitionSchema = z.object({
  token: z.string().length(64, 'Token must be 64 characters'),
  password: z.string().min(6, 'Password must have at least 6 characters'),
});

export type PasswordRedefinitionDto = z.infer<typeof passwordRedefinitionSchema>;
