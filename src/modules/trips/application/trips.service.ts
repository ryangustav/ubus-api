import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import type Redis from 'ioredis';
import { DRIZZLE } from '../../../shared/database/database.module';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../../shared/database/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

const TRIP_LOCATION_PREFIX = 'trip:location:';
const TRIP_ALERTA_PREFIX = 'trip:alerta:';
const ALERTA_TTL = 300; // 5 min

@Injectable()
export class TripsService {
  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
    @InjectRedis() private redis: Redis,
  ) {}

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
    if (!viagem) throw new NotFoundException('Trip not found');
    return viagem;
  }

  async triggerAlertaConfirmacao(
    idViagem: string,
    userId: string,
    municipalityId: string,
  ) {
    const [viagem] = await this.db
      .select()
      .from(schema.viagens)
      .where(eq(schema.viagens.idViagem, idViagem));
    if (!viagem) throw new NotFoundException('Trip not found');

    const isLeader =
      Array.isArray(viagem.lideresIds) && viagem.lideresIds.includes(userId);
    const [motorista] = viagem.idMotorista
      ? await this.db
          .select()
          .from(schema.usuarios)
          .where(eq(schema.usuarios.id, viagem.idMotorista))
      : [null];
    const isMotorista = motorista?.id === userId;

    const [linha] = await this.db
      .select()
      .from(schema.linhas)
      .where(eq(schema.linhas.id, viagem.idLinha));
    if (linha?.idPrefeitura !== municipalityId) {
      throw new ForbiddenException('Trip belongs to another municipality');
    }
    if (!isLeader && !isMotorista) {
      throw new ForbiddenException('Only leader or driver can trigger alert');
    }

    const key = `${TRIP_ALERTA_PREFIX}${idViagem}`;
    await this.redis.setex(key, ALERTA_TTL, Date.now().toString());

    return { message: 'Confirmation alert triggered', expiresIn: ALERTA_TTL };
  }

  async encerrarEPunir(
    idViagem: string,
    userId: string,
    municipalityId: string,
  ) {
    const [viagem] = await this.db
      .select()
      .from(schema.viagens)
      .where(eq(schema.viagens.idViagem, idViagem));
    if (!viagem) throw new NotFoundException('Trip not found');

    const isLeader =
      Array.isArray(viagem.lideresIds) && viagem.lideresIds.includes(userId);
    const [linha] = await this.db
      .select()
      .from(schema.linhas)
      .where(eq(schema.linhas.id, viagem.idLinha));
    if (linha?.idPrefeitura !== municipalityId) {
      throw new ForbiddenException('Trip belongs to another municipality');
    }
    if (!isLeader) {
      throw new ForbiddenException('Only leader can confirm absences');
    }

    const reservas = await this.db
      .select()
      .from(schema.reservas)
      .where(eq(schema.reservas.idViagem, idViagem));

    for (const r of reservas) {
      if (r.status === 'CONFIRMADA') {
        await this.db
          .update(schema.reservas)
          .set({ status: 'FALTOU' })
          .where(eq(schema.reservas.id, r.id));

        const [user] = await this.db
          .select({ nivelPrioridade: schema.usuarios.nivelPrioridade })
          .from(schema.usuarios)
          .where(eq(schema.usuarios.id, r.idUsuario));
        const newLevel = Math.min(3, (user?.nivelPrioridade ?? 1) + 1);
        const blockUntil = new Date();
        blockUntil.setDate(blockUntil.getDate() + 7);

        await this.db
          .update(schema.usuarios)
          .set({
            nivelPrioridade: newLevel,
            bloqueioAssentoAte: blockUntil,
          })
          .where(eq(schema.usuarios.id, r.idUsuario));
      }
    }

    await this.db
      .update(schema.viagens)
      .set({ status: 'FINALIZADA' })
      .where(eq(schema.viagens.idViagem, idViagem));

    return { message: 'Absences confirmed and penalties applied' };
  }

  async transbordo(
    idViagem: string,
    tripIdDestino: string,
    userId: string,
    municipalityId: string,
  ) {
    const [viagemOrigem] = await this.db
      .select()
      .from(schema.viagens)
      .where(eq(schema.viagens.idViagem, idViagem));
    if (!viagemOrigem) throw new NotFoundException('Origin trip not found');

    const [viagemDestino] = await this.db
      .select()
      .from(schema.viagens)
      .where(eq(schema.viagens.idViagem, tripIdDestino));
    if (!viagemDestino) throw new NotFoundException('Destination trip not found');

    const isLeader =
      Array.isArray(viagemOrigem.lideresIds) &&
      viagemOrigem.lideresIds.includes(userId);
    const [linha] = await this.db
      .select()
      .from(schema.linhas)
      .where(eq(schema.linhas.id, viagemOrigem.idLinha));
    if (linha?.idPrefeitura !== municipalityId) {
      throw new ForbiddenException('Trip belongs to another municipality');
    }
    if (!isLeader) {
      throw new ForbiddenException('Only leader can relocate');
    }

    const reservas = await this.db
      .select()
      .from(schema.reservas)
      .where(eq(schema.reservas.idViagem, idViagem));

    const ocupadosDestino = await this.db
      .select({ numeroAssento: schema.reservas.numeroAssento })
      .from(schema.reservas)
      .where(eq(schema.reservas.idViagem, tripIdDestino));

    const ocupadosSet = new Set(
      ocupadosDestino.map((o) => o.numeroAssento).filter((n): n is number => n != null),
    );

    let seat = 1;
    for (const r of reservas) {
      let newSeat: number | null = r.numeroAssento;
      if (r.numeroAssento != null) {
        while (ocupadosSet.has(seat)) seat++;
        newSeat = seat;
        ocupadosSet.add(seat);
      }

      await this.db
        .update(schema.reservas)
        .set({
          idViagem: tripIdDestino,
          numeroAssento: newSeat,
        })
        .where(eq(schema.reservas.id, r.id));
    }

    await this.db
      .update(schema.viagens)
      .set({ status: 'CANCELADA' })
      .where(eq(schema.viagens.idViagem, idViagem));

    return { message: 'Relocation completed' };
  }

  async updateLocation(
    idViagem: string,
    lat: number,
    lng: number,
    userId: string,
    municipalityId: string,
  ) {
    const [viagem] = await this.db
      .select()
      .from(schema.viagens)
      .where(eq(schema.viagens.idViagem, idViagem));
    if (!viagem) throw new NotFoundException('Trip not found');

    const isMotorista = viagem.idMotorista === userId;
    const isLeader =
      Array.isArray(viagem.lideresIds) && viagem.lideresIds.includes(userId);
    const [linha] = await this.db
      .select()
      .from(schema.linhas)
      .where(eq(schema.linhas.id, viagem.idLinha));
    if (linha?.idPrefeitura !== municipalityId) {
      throw new ForbiddenException('Trip belongs to another municipality');
    }
    if (!isMotorista && !isLeader) {
      throw new ForbiddenException('Only driver or leader can update location');
    }

    const key = `${TRIP_LOCATION_PREFIX}${idViagem}`;
    const payload = JSON.stringify({
      lat,
      lng,
      at: new Date().toISOString(),
    });
    await this.redis.setex(key, 3600, payload);

    return { message: 'Location updated' };
  }

  async getLocation(idViagem: string) {
    const key = `${TRIP_LOCATION_PREFIX}${idViagem}`;
    const raw = await this.redis.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as { lat: number; lng: number; at: string };
    } catch {
      return null;
    }
  }

  async getAlertaStatus(idViagem: string) {
    const key = `${TRIP_ALERTA_PREFIX}${idViagem}`;
    const ttl = await this.redis.ttl(key);
    if (ttl <= 0) return { active: false };
    return { active: true, expiresIn: ttl };
  }
}
