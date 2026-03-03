import { z } from 'zod';

export const registerSchema = z.object({
  idPrefeitura: z.string().uuid('ID da prefeitura inválido'),
  cpf: z.string().regex(/^\d{11}$|^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido'),
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  telefone: z.string().optional(),
  role: z
    .enum(['GESTOR', 'MOTORISTA', 'LIDER', 'ALUNO', 'CARONISTA'])
    .optional()
    .default('ALUNO'),
  nivelPrioridade: z.number().int().min(1).max(3).optional(), // 1: Titular, 2: Univ. Caronista, 3: Caronista Comum
  idLinhaPadrao: z.string().uuid().optional(),
});

export type RegisterDto = z.infer<typeof registerSchema>;
