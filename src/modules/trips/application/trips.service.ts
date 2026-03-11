import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type Redis from 'ioredis';
import { Viagem, ViagemDocument } from '../../../shared/database/schema/trip.schema';
import { Usuario, UsuarioDocument } from '../../../shared/database/schema/user.schema';
import { Linha, LinhaDocument } from '../../../shared/database/schema/fleet.schema';
import { Reserva, ReservaDocument } from '../../../shared/database/schema/reservation.schema';

const TRIP_LOCATION_PREFIX = 'trip:location:';
const TRIP_ALERTA_PREFIX = 'trip:alerta:';
const ALERTA_TTL = 300; // 5 min

@Injectable()
export class TripsService {
  constructor(
    @InjectModel(Viagem.name) private viagemModel: Model<ViagemDocument>,
    @InjectModel(Usuario.name) private usuarioModel: Model<UsuarioDocument>,
    @InjectModel(Linha.name) private linhaModel: Model<LinhaDocument>,
    @InjectModel(Reserva.name) private reservaModel: Model<ReservaDocument>,
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
    const viagem = new this.viagemModel({
      idViagem: dto.idViagem,
      dataViagem: new Date(dto.dataViagem),
      turno: dto.turno,
      direcao: dto.direcao,
      idLinha: dto.idLinha,
      idOnibus: dto.idOnibus,
      idMotorista: dto.idMotorista,
      capacidadeReal: dto.capacidadeReal,
      aberturaVotacao: new Date(dto.aberturaVotacao),
      fechamentoVotacao: new Date(dto.fechamentoVotacao),
      lideresIds: dto.lideresIds ?? [],
    });
    return viagem.save();
  }

  async getViagem(idViagem: string) {
    return this.viagemModel.findOne({ idViagem }).exec();
  }

  async listViagensAbertas() {
    const now = new Date();
    return this.viagemModel.find({
      status: 'ABERTA_PARA_RESERVA',
      aberturaVotacao: { $lte: now },
      fechamentoVotacao: { $gte: now },
    }).exec();
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
    if (dto.dataViagem !== undefined) updates.dataViagem = new Date(dto.dataViagem);
    if (dto.turno !== undefined) updates.turno = dto.turno;
    if (dto.direcao !== undefined) updates.direcao = dto.direcao;
    if (dto.idLinha !== undefined) updates.idLinha = dto.idLinha;
    if (dto.idOnibus !== undefined) updates.idOnibus = dto.idOnibus;
    if (dto.idMotorista !== undefined) updates.idMotorista = dto.idMotorista;
    if (dto.capacidadeReal !== undefined) updates.capacidadeReal = dto.capacidadeReal;
    if (dto.aberturaVotacao !== undefined) updates.aberturaVotacao = new Date(dto.aberturaVotacao);
    if (dto.fechamentoVotacao !== undefined) updates.fechamentoVotacao = new Date(dto.fechamentoVotacao);
    if (dto.lideresIds !== undefined) updates.lideresIds = dto.lideresIds;
    if (dto.status !== undefined) updates.status = dto.status;

    const viagem = await this.viagemModel.findOneAndUpdate(
      { idViagem },
      { $set: updates },
      { new: true }
    ).exec();
    
    if (!viagem) throw new NotFoundException('Trip not found');
    return viagem;
  }

  async triggerAlertaConfirmacao(
    idViagem: string,
    userId: string,
    municipalityId: string,
  ) {
    const viagem = await this.viagemModel.findOne({ idViagem }).exec();
    if (!viagem) throw new NotFoundException('Trip not found');

    const isLeader = Array.isArray(viagem.lideresIds) && viagem.lideresIds.includes(userId);
    const motorista = viagem.idMotorista ? await this.usuarioModel.findById(viagem.idMotorista).exec() : null;
    const isMotorista = motorista?.id === userId;

    const linha = await this.linhaModel.findById(viagem.idLinha).exec();
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
    const viagem = await this.viagemModel.findOne({ idViagem }).exec();
    if (!viagem) throw new NotFoundException('Trip not found');

    const isLeader = Array.isArray(viagem.lideresIds) && viagem.lideresIds.includes(userId);
    const linha = await this.linhaModel.findById(viagem.idLinha).exec();
    
    if (linha?.idPrefeitura !== municipalityId) {
      throw new ForbiddenException('Trip belongs to another municipality');
    }
    if (!isLeader) {
      throw new ForbiddenException('Only leader can confirm absences');
    }

    const reservas = await this.reservaModel.find({ idViagem }).exec();

    for (const r of reservas) {
      if (r.status === 'CONFIRMADA') {
        r.status = 'FALTOU';
        await r.save();

        const user = await this.usuarioModel.findById(r.idUsuario).exec();
        const newLevel = Math.min(3, (user?.nivelPrioridade ?? 1) + 1);
        const blockUntil = new Date();
        blockUntil.setDate(blockUntil.getDate() + 7);

        if (user) {
          user.nivelPrioridade = newLevel;
          user.bloqueioAssentoAte = blockUntil;
          await user.save();
        }
      }
    }

    viagem.status = 'FINALIZADA';
    await viagem.save();

    return { message: 'Absences confirmed and penalties applied' };
  }

  async transbordo(
    idViagem: string,
    tripIdDestino: string,
    userId: string,
    municipalityId: string,
  ) {
    const viagemOrigem = await this.viagemModel.findOne({ idViagem }).exec();
    if (!viagemOrigem) throw new NotFoundException('Origin trip not found');

    const viagemDestino = await this.viagemModel.findOne({ idViagem: tripIdDestino }).exec();
    if (!viagemDestino) throw new NotFoundException('Destination trip not found');

    const isLeader = Array.isArray(viagemOrigem.lideresIds) && viagemOrigem.lideresIds.includes(userId);
    const linha = await this.linhaModel.findById(viagemOrigem.idLinha).exec();

    if (linha?.idPrefeitura !== municipalityId) {
      throw new ForbiddenException('Trip belongs to another municipality');
    }
    if (!isLeader) {
      throw new ForbiddenException('Only leader can relocate');
    }

    const reservas = await this.reservaModel.find({ idViagem }).exec();
    const ocupadosDestino = await this.reservaModel.find({ idViagem: tripIdDestino }).exec();

    const ocupadosSet = new Set(
      ocupadosDestino.map((o) => o.numeroAssento).filter((n): n is number => n != null),
    );

    let seat = 1;
    for (const r of reservas) {
      let newSeat: number | null | undefined = r.numeroAssento;
      if (r.numeroAssento != null) {
        while (ocupadosSet.has(seat)) seat++;
        newSeat = seat;
        ocupadosSet.add(seat);
      }

      r.idViagem = tripIdDestino;
      r.numeroAssento = newSeat;
      await r.save();
    }

    viagemOrigem.status = 'CANCELADA';
    await viagemOrigem.save();

    return { message: 'Relocation completed' };
  }

  async updateLocation(
    idViagem: string,
    lat: number,
    lng: number,
    userId: string,
    municipalityId: string,
  ) {
    const viagem = await this.viagemModel.findOne({ idViagem }).exec();
    if (!viagem) throw new NotFoundException('Trip not found');

    const isMotorista = viagem.idMotorista === userId;
    const isLeader = Array.isArray(viagem.lideresIds) && viagem.lideresIds.includes(userId);
    
    const linha = await this.linhaModel.findById(viagem.idLinha).exec();
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
