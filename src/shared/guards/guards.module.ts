import { Global, Module } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { BusLeaderGuard } from './bus-leader.guard';

@Global()
@Module({
  providers: [JwtAuthGuard, RolesGuard, BusLeaderGuard],
  exports: [JwtAuthGuard, RolesGuard, BusLeaderGuard],
})
export class GuardsModule {}
