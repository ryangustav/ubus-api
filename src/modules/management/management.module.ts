import { Module } from '@nestjs/common';
import { ManagementController } from './management.controller';
import { ManagementService } from './application/management.service';

@Module({
  controllers: [ManagementController],
  providers: [ManagementService],
  exports: [ManagementService],
})
export class ManagementModule {}
