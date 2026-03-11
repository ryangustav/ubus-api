import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri:
          config.get<string>('DATABASE_URL') ||
          'mongodb://ubus:ubus@localhost:27017/ubus?authSource=admin',
      }),
    }),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
