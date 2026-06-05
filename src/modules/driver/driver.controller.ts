import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { DriverService } from './driver.service';
import {
  DriverAssignmentPayloadDto,
  DriverDepartingPayloadDto,
} from './dto/driver.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/guards/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/infrastructure/strategies/jwt.strategy';

@ApiTags('driver')
@Controller('driver')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DriverController {
  constructor(private driverService: DriverService) {}

  @Post('assignment')
  @UseGuards(RolesGuard)
  @Roles('DRIVER')
  @ApiOperation({ summary: 'Self-assign driver to daily trips for a bus' })
  @ApiBody({ type: DriverAssignmentPayloadDto })
  assignForToday(
    @CurrentUser() user: JwtPayload,
    @Body() dto: DriverAssignmentPayloadDto,
  ) {
    return this.driverService.assignForToday(
      user.sub,
      user.municipalityId,
      dto,
    );
  }

  @Get('trips/current')
  @UseGuards(RolesGuard)
  @Roles('DRIVER')
  @ApiOperation({ summary: 'Get summary of current active/upcoming trip' })
  getCurrentTripSummary(@CurrentUser() user: JwtPayload) {
    return this.driverService.getCurrentTripSummary(user.sub);
  }

  @Post('trips/:tripId/departing')
  @UseGuards(RolesGuard)
  @Roles('DRIVER')
  @ApiOperation({ summary: 'Notify trip departure (ongoing)' })
  @ApiParam({ name: 'tripId' })
  @ApiBody({ type: DriverDepartingPayloadDto })
  notifyDeparting(
    @Param('tripId') tripId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.driverService.departTrip(tripId, user.sub);
  }
}
