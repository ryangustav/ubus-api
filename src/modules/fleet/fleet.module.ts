import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FleetController } from './fleet.controller';
import { FleetService } from './application/fleet.service';
import { Linha, LinhaSchema, Onibus, OnibusSchema } from '../../shared/database/schema/fleet.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Linha.name, schema: LinhaSchema }, { name: Onibus.name, schema: OnibusSchema }])],
  controllers: [FleetController],
  providers: [FleetService],
  exports: [FleetService],
})
export class FleetModule {}
