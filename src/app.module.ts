import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './shared/database/database.module';
import { GuardsModule } from './shared/guards/guards.module';
import { RedisModule } from './shared/redis/redis.module';
import { QueueModule } from './shared/queue/queue.module';
import { AuthModule } from './modules/auth/auth.module';
import { PrefeituraModule } from './modules/prefeitura/prefeitura.module';
import { FleetModule } from './modules/fleet/fleet.module';
import { TripsModule } from './modules/trips/trips.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    GuardsModule,
    RedisModule,
    QueueModule,
    AuthModule,
    PrefeituraModule,
    FleetModule,
    TripsModule,
    ReservationsModule,
    HealthModule,
  ],
})
export class AppModule {}
