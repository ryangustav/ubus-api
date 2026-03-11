import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { Prefeitura, PrefeituraSchema } from '../../shared/database/schema/prefeitura.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Prefeitura.name, schema: PrefeituraSchema }])],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
