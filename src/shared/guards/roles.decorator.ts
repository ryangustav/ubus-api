import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export type Role = 'SUPER_ADMIN' | 'GESTOR' | 'MOTORISTA' | 'LIDER' | 'ALUNO' | 'CARONISTA';

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
