import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '../../../shared/database/database.module';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../../shared/database/schema';
import { and, eq } from 'drizzle-orm';

@Injectable()
export class FleetService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async listLinhas(idPrefeitura: string) {
    return this.db
      .select()
      .from(schema.linhas)
      .where(
        and(
          eq(schema.linhas.idPrefeitura, idPrefeitura),
          eq(schema.linhas.isAtivo, true),
        ),
      );
  }

  async listOnibus(idPrefeitura: string) {
    return this.db
      .select()
      .from(schema.onibus)
      .where(
        and(
          eq(schema.onibus.idPrefeitura, idPrefeitura),
          eq(schema.onibus.isAtivo, true),
        ),
      );
  }

  async createLinha(
    idPrefeitura: string,
    dto: {
      nome: string;
      descricao?: string;
      diasDaSemana: number[];
      horarioAberturaVotacao: string;
      horarioFechamentoVotacao: string;
    },
  ) {
    const [linha] = await this.db
      .insert(schema.linhas)
      .values({
        idPrefeitura,
        nome: dto.nome,
        descricao: dto.descricao ?? null,
        diasDaSemana: dto.diasDaSemana,
        horarioAberturaVotacao: dto.horarioAberturaVotacao,
        horarioFechamentoVotacao: dto.horarioFechamentoVotacao,
      })
      .returning();
    return linha;
  }

  async updateLinha(
    idPrefeitura: string,
    id: string,
    dto: {
      nome?: string;
      descricao?: string;
      diasDaSemana?: number[];
      horarioAberturaVotacao?: string;
      horarioFechamentoVotacao?: string;
      isAtivo?: boolean;
    },
  ) {
    const updates: Partial<typeof schema.linhas.$inferInsert> = {};
    if (dto.nome !== undefined) updates.nome = dto.nome;
    if (dto.descricao !== undefined) updates.descricao = dto.descricao;
    if (dto.diasDaSemana !== undefined) updates.diasDaSemana = dto.diasDaSemana;
    if (dto.horarioAberturaVotacao !== undefined)
      updates.horarioAberturaVotacao = dto.horarioAberturaVotacao;
    if (dto.horarioFechamentoVotacao !== undefined)
      updates.horarioFechamentoVotacao = dto.horarioFechamentoVotacao;
    if (dto.isAtivo !== undefined) updates.isAtivo = dto.isAtivo;
    const [linha] = await this.db
      .update(schema.linhas)
      .set(updates)
      .where(
        and(
          eq(schema.linhas.id, id),
          eq(schema.linhas.idPrefeitura, idPrefeitura),
        ),
      )
      .returning();
    if (!linha) throw new NotFoundException('Linha não encontrada');
    return linha;
  }

  async createOnibus(
    idPrefeitura: string,
    dto: {
      numeroIdentificacao: string;
      placa: string;
      capacidadePadrao: number;
      temBanheiro?: boolean;
      temArCondicionado?: boolean;
    },
    idMotorista?: string,
  ) {
    const [onibus] = await this.db
      .insert(schema.onibus)
      .values({
        idPrefeitura,
        idMotorista: idMotorista ?? null,
        numeroIdentificacao: dto.numeroIdentificacao,
        placa: dto.placa,
        capacidadePadrao: dto.capacidadePadrao,
        temBanheiro: dto.temBanheiro ?? false,
        temArCondicionado: dto.temArCondicionado ?? false,
      })
      .returning();
    return onibus;
  }

  async listOnibusByMotorista(idPrefeitura: string, idMotorista: string) {
    return this.db
      .select()
      .from(schema.onibus)
      .where(
        and(
          eq(schema.onibus.idPrefeitura, idPrefeitura),
          eq(schema.onibus.idMotorista, idMotorista),
        ),
      );
  }

  async updateOnibus(
    idPrefeitura: string,
    id: string,
    dto: {
      numeroIdentificacao?: string;
      placa?: string;
      capacidadePadrao?: number;
      temBanheiro?: boolean;
      temArCondicionado?: boolean;
      isAtivo?: boolean;
    },
  ) {
    const updates: Partial<typeof schema.onibus.$inferInsert> = {};
    if (dto.numeroIdentificacao !== undefined)
      updates.numeroIdentificacao = dto.numeroIdentificacao;
    if (dto.placa !== undefined) updates.placa = dto.placa;
    if (dto.capacidadePadrao !== undefined)
      updates.capacidadePadrao = dto.capacidadePadrao;
    if (dto.temBanheiro !== undefined) updates.temBanheiro = dto.temBanheiro;
    if (dto.temArCondicionado !== undefined)
      updates.temArCondicionado = dto.temArCondicionado;
    if (dto.isAtivo !== undefined) updates.isAtivo = dto.isAtivo;
    const [onibus] = await this.db
      .update(schema.onibus)
      .set(updates)
      .where(
        and(
          eq(schema.onibus.id, id),
          eq(schema.onibus.idPrefeitura, idPrefeitura),
        ),
      )
      .returning();
    if (!onibus) throw new NotFoundException('Ônibus não encontrado');
    return onibus;
  }
}
