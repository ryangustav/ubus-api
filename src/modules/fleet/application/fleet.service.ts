import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Linha, LinhaDocument, Onibus, OnibusDocument } from '../../../shared/database/schema/fleet.schema';

@Injectable()
export class FleetService {
  constructor(
    @InjectModel(Linha.name) private linhaModel: Model<LinhaDocument>,
    @InjectModel(Onibus.name) private onibusModel: Model<OnibusDocument>,
  ) {}

  async listLinhas(idPrefeitura: string) {
    return this.linhaModel.find({ idPrefeitura, active: true }).exec();
  }

  async listOnibus(idPrefeitura: string) {
    return this.onibusModel.find({ idPrefeitura, active: true }).exec();
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
    const linha = new this.linhaModel({
      idPrefeitura,
      nome: dto.nome,
      descricao: dto.descricao,
      diasDaSemana: dto.diasDaSemana,
      horarioAberturaVotacao: dto.horarioAberturaVotacao,
      horarioFechamentoVotacao: dto.horarioFechamentoVotacao,
    });
    return linha.save();
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
      active?: boolean;
    },
  ) {
    const linha = await this.linhaModel.findOneAndUpdate(
      { _id: id, idPrefeitura },
      { $set: dto },
      { new: true }
    ).exec();

    if (!linha) throw new NotFoundException('Route not found');
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
    const onibus = new this.onibusModel({
      idPrefeitura,
      idMotorista,
      numeroIdentificacao: dto.numeroIdentificacao,
      placa: dto.placa,
      capacidadePadrao: dto.capacidadePadrao,
      temBanheiro: dto.temBanheiro ?? false,
      temArCondicionado: dto.temArCondicionado ?? false,
    });
    return onibus.save();
  }

  async listOnibusByMotorista(idPrefeitura: string, idMotorista: string) {
    return this.onibusModel.find({ idPrefeitura, idMotorista }).exec();
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
      active?: boolean;
    },
  ) {
    const onibus = await this.onibusModel.findOneAndUpdate(
      { _id: id, idPrefeitura },
      { $set: dto },
      { new: true }
    ).exec();
    
    if (!onibus) throw new NotFoundException('Bus not found');
    return onibus;
  }
}
