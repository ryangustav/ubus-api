import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DRIZZLE } from '../../../shared/database/database.module';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../../shared/database/schema';
import { and, eq } from 'drizzle-orm';

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async listPendentes(municipalityId: string) {
    return this.db
      .select()
      .from(schema.usuarios)
      .where(
        and(
          eq(schema.usuarios.idPrefeitura, municipalityId),
          eq(schema.usuarios.statusCadastro, 'PENDENTE'),
          eq(schema.usuarios.role, 'ALUNO'),
        ),
      );
  }

  async updateStatus(
    id: string,
    status: 'APROVADO' | 'REJEITADO',
    municipalityId: string,
  ) {
    const [user] = await this.db
      .select()
      .from(schema.usuarios)
      .where(eq(schema.usuarios.id, id));

    if (!user) throw new NotFoundException('User not found');
    if (user.idPrefeitura !== municipalityId) {
      throw new ForbiddenException('User belongs to another municipality');
    }
    if (user.statusCadastro !== 'PENDENTE') {
      throw new ForbiddenException('User is not pending approval');
    }

    const [updated] = await this.db
      .update(schema.usuarios)
      .set({ statusCadastro: status })
      .where(eq(schema.usuarios.id, id))
      .returning();

    return updated;
  }
}
