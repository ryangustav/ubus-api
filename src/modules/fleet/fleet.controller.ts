import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FleetService } from './application/fleet.service';
import { CreateRouteDto, UpdateRouteDto } from './dto/route.dto';
import { CreateBusDto, UpdateBusDto } from './dto/bus.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/guards/roles.decorator';
import { BusLeaderGuard } from '../../shared/guards/bus-leader.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/infrastructure/strategies/jwt.strategy';

@ApiTags('fleet')
@Controller('fleet')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FleetController {
  constructor(private fleet: FleetService) {}

  @Get('routes')
  @ApiOperation({ summary: 'List routes of municipality' })
  listRoutes(@CurrentUser() user: JwtPayload) {
    return this.fleet.listRoutes(user.municipalityId);
  }

  @Get('routes/:id/points')
  @ApiOperation({ summary: 'List pick-up points of a route' })
  @ApiParam({ name: 'id', description: 'Route ID' })
  listPoints(@Param('id') id: string) {
    return this.fleet.listPointsByRoute(id);
  }

  @Get('buses')
  @ApiOperation({ summary: 'List buses of municipality' })
  listBuses(@CurrentUser() user: JwtPayload) {
    return this.fleet.listBuses(user.municipalityId);
  }

  @Post('routes')
  @UseGuards(RolesGuard)
  @Roles('MANAGER')
  @ApiOperation({ summary: 'Create route (manager only)' })
  @ApiBody({ type: CreateRouteDto })
  createRoute(@CurrentUser() user: JwtPayload, @Body() dto: CreateRouteDto) {
    const municipalityId =
      user.role === 'SUPER_ADMIN' && dto.municipalityId
        ? dto.municipalityId
        : user.municipalityId;
    return this.fleet.createRoute(municipalityId, dto);
  }

  @Patch('routes/:id')
  @UseGuards(RolesGuard)
  @Roles('MANAGER')
  @ApiOperation({ summary: 'Update route (manager only)' })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: UpdateRouteDto })
  updateRoute(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateRouteDto,
  ) {
    const municipalityId =
      user.role === 'SUPER_ADMIN' && dto.municipalityId
        ? dto.municipalityId
        : user.municipalityId;
    return this.fleet.updateRoute(municipalityId, id, dto);
  }

  @Get('buses/mine')
  @UseGuards(RolesGuard)
  @Roles('DRIVER')
  @ApiOperation({ summary: 'List buses registered by driver' })
  listMyBuses(@CurrentUser() user: JwtPayload) {
    return this.fleet.listBusesByDriver(user.municipalityId, user.sub);
  }

  @Post('buses')
  @UseGuards(RolesGuard)
  @Roles('DRIVER', 'MANAGER')
  @ApiOperation({
    summary: 'Create bus (driver or manager). Driver: saves driverId.',
  })
  @ApiBody({ type: CreateBusDto })
  createBus(@CurrentUser() user: JwtPayload, @Body() dto: CreateBusDto) {
    const municipalityId =
      user.role === 'SUPER_ADMIN' && dto.municipalityId
        ? dto.municipalityId
        : user.municipalityId;
    const driverId = user.role === 'DRIVER' ? user.sub : undefined;
    return this.fleet.createBus(municipalityId, dto, driverId);
  }

  @Patch('buses/:id')
  @UseGuards(BusLeaderGuard)
  @ApiOperation({
    summary: 'Update bus (driver, manager or route leader)',
  })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: UpdateBusDto })
  updateBus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateBusDto,
  ) {
    const municipalityId =
      user.role === 'SUPER_ADMIN' && dto.municipalityId
        ? dto.municipalityId
        : user.municipalityId;
    return this.fleet.updateBus(municipalityId, id, dto);
  }
}
