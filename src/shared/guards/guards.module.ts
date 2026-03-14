import { Global, Module } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LiderOnibusGuard } from './lider-onibus.guard';

@Global()
@Module({
  providers: [JwtAuthGuard, RolesGuard, LiderOnibusGuard],
  exports: [JwtAuthGuard, RolesGuard, LiderOnibusGuard],
})
export class GuardsModule {}
