import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RolesGuard } from './roles.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LiderOnibusGuard } from './lider-onibus.guard';
import { Onibus, OnibusSchema } from '../database/schema/fleet.schema';
import { Viagem, ViagemSchema } from '../database/schema/trip.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Onibus.name, schema: OnibusSchema },
      { name: Viagem.name, schema: ViagemSchema },
    ]),
  ],
  providers: [JwtAuthGuard, RolesGuard, LiderOnibusGuard],
  exports: [JwtAuthGuard, RolesGuard, LiderOnibusGuard],
})
export class GuardsModule {}
