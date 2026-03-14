import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE } from '../../../shared/database/database.module';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../../shared/database/schema';
import { eq, and, isNotNull, gte } from 'drizzle-orm';

@Injectable()
export class ReservationsService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  /**
   * Create: Reserva assento. numeroAssento null = ônibus de excesso.
   * UNIQUE(id_viagem, numero_assento) evita overbooking.
   */
  async create(dto: {
    idViagem: string;
    idUsuario: string;
    numeroAssento?: number | null;
    isCarona?: boolean;
  }) {
    const [viagem] = await this.db
      .select()
      .from(schema.viagens)
      .where(eq(schema.viagens.idViagem, dto.idViagem));
    if (!viagem) {
      throw new NotFoundException(`Trip "${dto.idViagem}" not found`);
    }

    const isExcesso = dto.numeroAssento == null;
    if (isExcesso) {
      const ocupados = await this.getAssentosOcupados(dto.idViagem);
      if (ocupados.length < viagem.capacidadeReal) {
        throw new BadRequestException(
          `Excess voting only opens when capacity is full (${ocupados.length}/${viagem.capacidadeReal})`,
        );
      }
    }
    const [reserva] = await this.db
      .insert(schema.reservas)
      .values({
        idViagem: dto.idViagem,
        idUsuario: dto.idUsuario,
        numeroAssento: dto.numeroAssento ?? null,
        isCarona: dto.isCarona ?? false,
        status: isExcesso ? 'EXCESSO' : 'CONFIRMADA',
      })
      .returning();
    return reserva;
  }

  async findOne(id: string) {
    const [reserva] = await this.db
      .select()
      .from(schema.reservas)
      .where(eq(schema.reservas.id, id));
    if (!reserva) throw new NotFoundException('Reservation not found');
    return reserva;
  }

  async findMinhas(idUsuario: string) {
    const rows = await this.db
      .select({
        reserva: schema.reservas,
        viagem: schema.viagens,
      })
      .from(schema.reservas)
      .innerJoin(
        schema.viagens,
        eq(schema.reservas.idViagem, schema.viagens.idViagem),
      )
      .where(
        and(
          eq(schema.reservas.idUsuario, idUsuario),
          gte(schema.viagens.dataViagem, new Date().toISOString().slice(0, 10)),
        ),
      );
    return rows;
  }

  async findByViagem(idViagem: string) {
    return this.db
      .select()
      .from(schema.reservas)
      .where(eq(schema.reservas.idViagem, idViagem));
  }

  async getAssentosOcupados(idViagem: string): Promise<number[]> {
    const rows = await this.db
      .select({ numeroAssento: schema.reservas.numeroAssento })
      .from(schema.reservas)
      .where(
        and(
          eq(schema.reservas.idViagem, idViagem),
          isNotNull(schema.reservas.numeroAssento),
        ),
      );
    return rows
      .map((r) => r.numeroAssento)
      .filter((n): n is number => n != null);
  }

  /**
   * Update: Trocar assento ou status. Se idUsuario informado, só permite se for dono.
   */
  async update(
    id: string,
    dto: {
      numeroAssento?: number | null;
      status?: (typeof schema.reservas.$inferSelect)['status'];
    },
    idUsuario?: string,
  ) {
    const [existe] = await this.db
      .select()
      .from(schema.reservas)
      .where(eq(schema.reservas.id, id));
    if (!existe) throw new NotFoundException('Reserva não encontrada');
    if (idUsuario && existe.idUsuario !== idUsuario) {
      throw new ForbiddenException('Can only update your own reservation');
    }
    const [reserva] = await this.db
      .update(schema.reservas)
      .set({
        ...(dto.numeroAssento !== undefined && {
          numeroAssento: dto.numeroAssento,
        }),
        ...(dto.status !== undefined && { status: dto.status }),
      })
      .where(eq(schema.reservas.id, id))
      .returning();
    return reserva;
  }

  /**
   * Delete: Cancelar reserva (remove e libera o assento). Se idUsuario informado, só permite se for dono.
   */
  async remove(id: string, idUsuario?: string) {
    const [existe] = await this.db
      .select()
      .from(schema.reservas)
      .where(eq(schema.reservas.id, id));
    if (!existe) throw new NotFoundException('Reserva não encontrada');
    if (idUsuario && existe.idUsuario !== idUsuario) {
      throw new ForbiddenException('Can only cancel your own reservation');
    }
    const [reserva] = await this.db
      .delete(schema.reservas)
      .where(eq(schema.reservas.id, id))
      .returning();
    return reserva;
  }
}
