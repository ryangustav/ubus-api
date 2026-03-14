import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './application/metrics.service';

@Module({
  controllers: [MetricsController],
  providers: [MetricsService],
})
export class MetricsModule {}
