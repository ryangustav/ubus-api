import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './application/metrics.service';
import { Usuario, UsuarioSchema } from '../../shared/database/schema/user.schema';
import { Viagem, ViagemSchema } from '../../shared/database/schema/trip.schema';
import { Linha, LinhaSchema } from '../../shared/database/schema/fleet.schema';
import { Onibus, OnibusSchema } from '../../shared/database/schema/fleet.schema';

@Module({
  imports: [MongooseModule.forFeature([
    { name: Usuario.name, schema: UsuarioSchema },
    { name: Viagem.name, schema: ViagemSchema },
    { name: Linha.name, schema: LinhaSchema },
    { name: Onibus.name, schema: OnibusSchema },
  ])],
  controllers: [MetricsController],
  providers: [MetricsService],
})
export class MetricsModule {}
