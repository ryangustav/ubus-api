import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq } from 'drizzle-orm';

/**
 * Permite: GESTOR, MOTORISTA ou líder de alguma viagem que usa este ônibus.
 */
@Injectable()
export class LiderOnibusGuard implements CanActivate {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      user?: { sub?: string; role?: string; prefeituraId?: string };
      params?: { id?: string };
    }>();
    const user = req.user;
    if (!user?.sub || !user?.prefeituraId) return false;

    if (user.role === 'GESTOR' || user.role === 'MOTORISTA') return true;

    const idOnibus = req.params?.id;
    if (!idOnibus) return false;

    const [onibus] = await this.db
      .select()
      .from(schema.onibus)
      .where(eq(schema.onibus.id, idOnibus));

    if (!onibus || onibus.idPrefeitura !== user.prefeituraId) return false;

    const viagens = await this.db
      .select({ lideresIds: schema.viagens.lideresIds })
      .from(schema.viagens)
      .where(eq(schema.viagens.idOnibus, idOnibus));

    const userId = user.sub;
    return viagens.some(
      (v) => Array.isArray(v.lideresIds) && v.lideresIds.includes(userId),
    );
  }
}
