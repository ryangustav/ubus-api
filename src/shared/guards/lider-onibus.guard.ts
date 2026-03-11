import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Onibus, OnibusDocument } from '../database/schema/fleet.schema';
import { Viagem, ViagemDocument } from '../database/schema/trip.schema';

@Injectable()
export class LiderOnibusGuard implements CanActivate {
  constructor(
    @InjectModel(Onibus.name) private onibusModel: Model<OnibusDocument>,
    @InjectModel(Viagem.name) private viagemModel: Model<ViagemDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      user?: { sub?: string; role?: string; municipalityId?: string };
      params?: { id?: string };
    }>();
    const user = req.user;
    if (!user?.sub || !user?.municipalityId) return false;

    if (user.role === 'GESTOR' || user.role === 'MOTORISTA') return true;

    const idOnibus = req.params?.id;
    if (!idOnibus) return false;

    const onibus = await this.onibusModel.findById(idOnibus).exec();

    if (!onibus || onibus.idPrefeitura !== user.municipalityId) return false;

    const viagens = await this.viagemModel.find({ idOnibus }).exec();

    const userId = user.sub;
    return viagens.some(
      (v) => Array.isArray(v.lideresIds) && v.lideresIds.includes(userId),
    );
  }
}
