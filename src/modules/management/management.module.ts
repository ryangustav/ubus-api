import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ManagementController } from './management.controller';
import { ManagementService } from './application/management.service';
import {
  Prefeitura,
  PrefeituraSchema,
} from '../../shared/database/schema/prefeitura.schema';
import {
  Usuario,
  UsuarioSchema,
} from '../../shared/database/schema/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Prefeitura.name, schema: PrefeituraSchema },
      { name: Usuario.name, schema: UsuarioSchema },
    ]),
  ],
  controllers: [ManagementController],
  providers: [ManagementService],
  exports: [ManagementService],
})
export class ManagementModule {}
