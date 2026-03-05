import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '../../../shared/database/database.module';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../../shared/database/schema';
import { and, eq, gte, lte, sql } from 'drizzle-orm';

@Injectable()
export class MetricsService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async getDashboard(municipalityId: string) {
    const today = new Date().toISOString().slice(0, 10);

    const [activeStudents] = await this.db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(schema.usuarios)
      .where(
        and(
          eq(schema.usuarios.idPrefeitura, municipalityId),
          eq(schema.usuarios.role, 'ALUNO'),
          eq(schema.usuarios.statusCadastro, 'APROVADO'),
        ),
      );

    const [tripsToday] = await this.db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(schema.viagens)
      .innerJoin(
        schema.linhas,
        eq(schema.viagens.idLinha, schema.linhas.id),
      )
      .where(
        and(
          eq(schema.linhas.idPrefeitura, municipalityId),
          eq(schema.viagens.dataViagem, today),
        ),
      );

    const [pendingCount] = await this.db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(schema.usuarios)
      .where(
        and(
          eq(schema.usuarios.idPrefeitura, municipalityId),
          eq(schema.usuarios.statusCadastro, 'PENDENTE'),
        ),
      );

    const [fleetActive] = await this.db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(schema.onibus)
      .where(
        and(
          eq(schema.onibus.idPrefeitura, municipalityId),
          eq(schema.onibus.active, true),
        ),
      );

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weeklyTrips = await this.db
      .select({
        dataViagem: schema.viagens.dataViagem,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.viagens)
      .innerJoin(schema.linhas, eq(schema.viagens.idLinha, schema.linhas.id))
      .where(
        and(
          eq(schema.linhas.idPrefeitura, municipalityId),
          gte(schema.viagens.dataViagem, weekStart.toISOString().slice(0, 10)),
          lte(schema.viagens.dataViagem, weekEnd.toISOString().slice(0, 10)),
        ),
      )
      .groupBy(schema.viagens.dataViagem);

    return {
      activeStudents: activeStudents?.count ?? 0,
      tripsToday: tripsToday?.count ?? 0,
      pendingApprovals: pendingCount?.count ?? 0,
      fleetActive: fleetActive?.count ?? 0,
      weeklyTrips: weeklyTrips.map((r) => ({
        date: r.dataViagem,
        count: r.count,
      })),
    };
  }
}
