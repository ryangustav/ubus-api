import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MetricsService } from './application/metrics.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/guards/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/infrastructure/strategies/jwt.strategy';

@ApiTags('metrics')
@Controller('metrics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MetricsController {
  constructor(private metrics: MetricsService) {}

  @Get('dashboard')
  @UseGuards(RolesGuard)
  @Roles('GESTOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Dashboard KPIs for manager' })
  getDashboard(@CurrentUser() user: JwtPayload) {
    return this.metrics.getDashboard(user.municipalityId);
  }
}
