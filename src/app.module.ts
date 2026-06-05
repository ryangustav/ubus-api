import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './shared/database/database.module';
import { GuardsModule } from './shared/guards/guards.module';
import { RedisModule } from './shared/redis/redis.module';
import { EmailModule } from './shared/email/email.module';
import { QueueModule } from './shared/queue/queue.module';
import { AuthModule } from './modules/auth/auth.module';
import { ManagementModule } from './modules/management/management.module';
import { UsersModule } from './modules/users/users.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { FleetModule } from './modules/fleet/fleet.module';
import { TripsModule } from './modules/trips/trips.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { HealthModule } from './modules/health/health.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { CronModule } from './modules/cron/cron.module';

import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 30, // Default 30 req/min globally
    }]),
    DatabaseModule,
    GuardsModule,
    RedisModule,
    EmailModule,
    QueueModule,
    AuthModule,
    ManagementModule,
    UsersModule,
    MetricsModule,
    FleetModule,
    TripsModule,
    ReservationsModule,
    HealthModule,
    NotificationsModule,
    UploadsModule,
    CronModule,
  ],
})
export class AppModule {}
