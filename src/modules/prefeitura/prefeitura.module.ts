import { Module } from '@nestjs/common';
import { PrefeituraController } from './prefeitura.controller';
import { PrefeituraService } from './application/prefeitura.service';

@Module({
  controllers: [PrefeituraController],
  providers: [PrefeituraService],
  exports: [PrefeituraService],
})
export class PrefeituraModule {}
