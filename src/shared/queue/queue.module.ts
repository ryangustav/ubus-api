import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD'),
          maxRetriesPerRequest: null,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: 'reservations' },
      { name: 'notifications' },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
