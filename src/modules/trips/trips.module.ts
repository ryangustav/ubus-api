import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TripsController } from './trips.controller';
import { TripsService } from './application/trips.service';
import { Viagem, ViagemSchema } from '../../shared/database/schema/trip.schema';
import { Usuario, UsuarioSchema } from '../../shared/database/schema/user.schema';
import { Linha, LinhaSchema } from '../../shared/database/schema/fleet.schema';
import { Reserva, ReservaSchema } from '../../shared/database/schema/reservation.schema';

@Module({
  imports: [MongooseModule.forFeature([
    { name: Viagem.name, schema: ViagemSchema },
    { name: Usuario.name, schema: UsuarioSchema },
    { name: Linha.name, schema: LinhaSchema },
    { name: Reserva.name, schema: ReservaSchema },
  ])],
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
