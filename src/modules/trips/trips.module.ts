import { Module } from '@nestjs/common';
import { TripsController } from './trips.controller';
import { TripsService } from './application/trips.service';

@Module({
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
