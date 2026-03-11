import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Reserva, ReservaDocument } from '../../../shared/database/schema/reservation.schema';
import { Viagem, ViagemDocument } from '../../../shared/database/schema/trip.schema';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectModel(Reserva.name) private reservaModel: Model<ReservaDocument>,
    @InjectModel(Viagem.name) private viagemModel: Model<ViagemDocument>,
  ) {}

  async create(dto: {
    idViagem: string;
    idUsuario: string;
    numeroAssento?: number | null;
    isCarona?: boolean;
  }) {
    const viagem = await this.viagemModel.findOne({ idViagem: dto.idViagem }).exec();
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
    const reserva = new this.reservaModel({
      idViagem: dto.idViagem,
      idUsuario: dto.idUsuario,
      numeroAssento: dto.numeroAssento ?? undefined,
      isCarona: dto.isCarona ?? false,
      status: isExcesso ? 'EXCESSO' : 'CONFIRMADA',
    });
    return reserva.save();
  }

  async findOne(id: string) {
    const reserva = await this.reservaModel.findById(id).exec();
    if (!reserva) throw new NotFoundException('Reservation not found');
    return reserva;
  }

  async findMinhas(idUsuario: string) {
    const reservas = await this.reservaModel.find({ idUsuario }).exec();
    const result: { reserva: ReservaDocument; viagem: ViagemDocument }[] = [];
    const today = new Date().toISOString().slice(0, 10);

    for (const r of reservas) {
      const v = await this.viagemModel.findOne({
        idViagem: r.idViagem,
        dataViagem: { $gte: new Date(today) }
      }).exec();
      if (v) {
        result.push({ reserva: r, viagem: v });
      }
    }
    return result;
  }

  async findByViagem(idViagem: string) {
    return this.reservaModel.find({ idViagem }).exec();
  }

  async getAssentosOcupados(idViagem: string): Promise<number[]> {
    const reservas = await this.reservaModel.find({
      idViagem,
      numeroAssento: { $exists: true, $ne: null }
    }).exec();
    
    return reservas
      .map((r) => r.numeroAssento)
      .filter((n): n is number => n != null);
  }

  async update(
    id: string,
    dto: {
      numeroAssento?: number | null;
      status?: string;
    },
    idUsuario?: string,
  ) {
    const existe = await this.reservaModel.findById(id).exec();
    if (!existe) throw new NotFoundException('Reserva não encontrada');
    
    if (idUsuario && existe.idUsuario !== idUsuario) {
      throw new ForbiddenException('Can only update your own reservation');
    }

    if (dto.numeroAssento !== undefined) existe.numeroAssento = dto.numeroAssento ?? undefined;
    if (dto.status !== undefined) existe.status = dto.status;
    
    await existe.save();
    return existe;
  }

  async remove(id: string, idUsuario?: string) {
    const existe = await this.reservaModel.findById(id).exec();
    if (!existe) throw new NotFoundException('Reserva não encontrada');
    
    if (idUsuario && existe.idUsuario !== idUsuario) {
      throw new ForbiddenException('Can only cancel your own reservation');
    }
    
    await this.reservaModel.findByIdAndDelete(id).exec();
    return existe;
  }
}
