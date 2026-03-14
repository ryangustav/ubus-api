import { Module } from '@nestjs/common';
import { FleetController } from './fleet.controller';
import { FleetService } from './application/fleet.service';

@Module({
  controllers: [FleetController],
  providers: [FleetService],
  exports: [FleetService],
})
export class FleetModule {}
