import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '../../../shared/database/database.module';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../../shared/database/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

@Injectable()
export class TripsService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async createViagem(dto: {
    idViagem: string;
    dataViagem: string;
    turno: string;
    direcao: 'IDA' | 'VOLTA';
    idLinha: string;
    idOnibus: string;
    idMotorista?: string;
    capacidadeReal: number;
    aberturaVotacao: string;
    fechamentoVotacao: string;
    lideresIds?: string[];
  }) {
    const [viagem] = await this.db
      .insert(schema.viagens)
      .values({
        idViagem: dto.idViagem,
        dataViagem: dto.dataViagem,
        turno: dto.turno,
        direcao: dto.direcao,
        idLinha: dto.idLinha,
        idOnibus: dto.idOnibus,
        idMotorista: dto.idMotorista ?? null,
        capacidadeReal: dto.capacidadeReal,
        aberturaVotacao: new Date(dto.aberturaVotacao),
        fechamentoVotacao: new Date(dto.fechamentoVotacao),
        lideresIds: dto.lideresIds ?? [],
      })
      .returning();
    return viagem;
  }

  async getViagem(idViagem: string) {
    const [viagem] = await this.db
      .select()
      .from(schema.viagens)
      .where(eq(schema.viagens.idViagem, idViagem));
    return viagem;
  }

  async listViagensAbertas() {
    const now = new Date();
    return this.db
      .select()
      .from(schema.viagens)
      .where(
        and(
          eq(schema.viagens.status, 'ABERTA_PARA_RESERVA'),
          lte(schema.viagens.aberturaVotacao, now),
          gte(schema.viagens.fechamentoVotacao, now),
        ),
      );
  }

  async updateViagem(
    idViagem: string,
    dto: Partial<{
      dataViagem: string;
      turno: string;
      direcao: 'IDA' | 'VOLTA';
      idLinha: string;
      idOnibus: string;
      idMotorista: string | null;
      capacidadeReal: number;
      aberturaVotacao: string;
      fechamentoVotacao: string;
      lideresIds: string[];
      status: string;
    }>,
  ) {
    const updates: Record<string, unknown> = {};
    if (dto.dataViagem !== undefined) updates.dataViagem = dto.dataViagem;
    if (dto.turno !== undefined) updates.turno = dto.turno;
    if (dto.direcao !== undefined) updates.direcao = dto.direcao;
    if (dto.idLinha !== undefined) updates.idLinha = dto.idLinha;
    if (dto.idOnibus !== undefined) updates.idOnibus = dto.idOnibus;
    if (dto.idMotorista !== undefined) updates.idMotorista = dto.idMotorista;
    if (dto.capacidadeReal !== undefined)
      updates.capacidadeReal = dto.capacidadeReal;
    if (dto.aberturaVotacao !== undefined)
      updates.aberturaVotacao = new Date(dto.aberturaVotacao);
    if (dto.fechamentoVotacao !== undefined)
      updates.fechamentoVotacao = new Date(dto.fechamentoVotacao);
    if (dto.lideresIds !== undefined) updates.lideresIds = dto.lideresIds;
    if (dto.status !== undefined) updates.status = dto.status;

    const [viagem] = await this.db
      .update(schema.viagens)
      .set(updates as Record<string, never>)
      .where(eq(schema.viagens.idViagem, idViagem))
      .returning();
    if (!viagem) throw new NotFoundException('Viagem não encontrada');
    return viagem;
  }
}
