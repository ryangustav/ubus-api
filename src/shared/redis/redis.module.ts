import { Global, Module } from '@nestjs/common';
import { RedisModule as NestRedisModule } from '@nestjs-modules/ioredis';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    NestRedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'single',
        url: config.get<string>('REDIS_URL', 'redis://localhost:6379'),
        options: {
          password: config.get<string>('REDIS_PASSWORD'),
        },
      }),
    }),
  ],
})
export class RedisModule {}
