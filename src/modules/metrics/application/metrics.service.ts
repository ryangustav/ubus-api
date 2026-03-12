import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Usuario,
  UsuarioDocument,
} from '../../../shared/database/schema/user.schema';
import {
  Viagem,
  ViagemDocument,
} from '../../../shared/database/schema/trip.schema';
import {
  Linha,
  LinhaDocument,
} from '../../../shared/database/schema/fleet.schema';
import {
  Onibus,
  OnibusDocument,
} from '../../../shared/database/schema/fleet.schema';

@Injectable()
export class MetricsService {
  constructor(
    @InjectModel(Usuario.name) private usuarioModel: Model<UsuarioDocument>,
    @InjectModel(Viagem.name) private viagemModel: Model<ViagemDocument>,
    @InjectModel(Linha.name) private linhaModel: Model<LinhaDocument>,
    @InjectModel(Onibus.name) private onibusModel: Model<OnibusDocument>,
  ) {}

  async getDashboard(municipalityId: string) {
    const today = new Date().toISOString().slice(0, 10);

    const activeStudents = await this.usuarioModel
      .countDocuments({
        idPrefeitura: municipalityId,
        role: 'ALUNO',
        statusCadastro: 'APROVADO',
      })
      .exec();

    const linhas = await this.linhaModel
      .find({ idPrefeitura: municipalityId })
      .select('_id')
      .exec();
    const linhasIds = linhas.map((l) => l.id);

    const tripsToday = await this.viagemModel
      .countDocuments({
        idLinha: { $in: linhasIds },
        dataViagem: {
          $gte: new Date(today),
          $lt: new Date(new Date(today).getTime() + 86400000),
        },
      })
      .exec();

    const pendingCount = await this.usuarioModel
      .countDocuments({
        idPrefeitura: municipalityId,
        statusCadastro: 'PENDENTE',
      })
      .exec();

    const fleetActive = await this.onibusModel
      .countDocuments({
        idPrefeitura: municipalityId,
        active: true,
      })
      .exec();

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weeklyTripsRaw = (await this.viagemModel
      .aggregate([
        {
          $match: {
            idLinha: { $in: linhasIds },
            dataViagem: { $gte: weekStart, $lte: weekEnd },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$dataViagem' },
            },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            date: '$_id',
            count: 1,
          },
        },
      ])
      .exec()) as Array<{ date: string; count: number }>;

    const weeklyTrips = weeklyTripsRaw.map((v) => ({
      date: v.date,
      count: v.count,
    }));

    return {
      activeStudents,
      tripsToday,
      pendingApprovals: pendingCount,
      fleetActive,
      weeklyTrips,
    };
  }
}
