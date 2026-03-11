import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './application/reservations.service';
import { Reserva, ReservaSchema } from '../../shared/database/schema/reservation.schema';
import { Viagem, ViagemSchema } from '../../shared/database/schema/trip.schema';

@Module({
  imports: [MongooseModule.forFeature([
    { name: Reserva.name, schema: ReservaSchema },
    { name: Viagem.name, schema: ViagemSchema },
  ])],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
