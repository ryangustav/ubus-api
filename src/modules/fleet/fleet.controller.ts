import {
  Body,
  Controller,
  Delete,
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
import { CreatePointDto, UpdatePointDto } from './dto/point.dto';
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

  // ── Routes ───────────────────────────────────────────
  @Get('routes')
  @ApiOperation({ summary: 'List routes of municipality' })
  listRoutes(@CurrentUser() user: JwtPayload) {
    return this.fleet.listRoutes(user.municipalityId);
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

  // ── Points ───────────────────────────────────────────
  @Get('routes/:id/points')
  @ApiOperation({ summary: 'List pick-up points of a route' })
  @ApiParam({ name: 'id', description: 'Route ID' })
  listPoints(@Param('id') id: string) {
    return this.fleet.listPointsByRoute(id);
  }

  @Post('routes/:id/points')
  @UseGuards(RolesGuard)
  @Roles('MANAGER')
  @ApiOperation({ summary: 'Create pick-up point on a route' })
  @ApiParam({ name: 'id', description: 'Route ID' })
  @ApiBody({ type: CreatePointDto })
  createPoint(
    @Param('id') routeId: string,
    @Body() dto: CreatePointDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.fleet.createPoint(routeId, dto, user.municipalityId);
  }

  @Patch('points/:id')
  @UseGuards(RolesGuard)
  @Roles('MANAGER')
  @ApiOperation({ summary: 'Update pick-up point' })
  @ApiParam({ name: 'id', description: 'Point ID' })
  @ApiBody({ type: UpdatePointDto })
  updatePoint(
    @Param('id') id: string,
    @Body() dto: UpdatePointDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.fleet.updatePoint(id, dto, user.municipalityId);
  }

  @Delete('points/:id')
  @UseGuards(RolesGuard)
  @Roles('MANAGER')
  @ApiOperation({ summary: 'Delete pick-up point' })
  @ApiParam({ name: 'id', description: 'Point ID' })
  deletePoint(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.fleet.deletePoint(id, user.municipalityId);
  }

  // ── Public Pickup Points ─────────────────────────────
  @Get('pickup-points')
  @ApiOperation({
    summary: 'List all pickup points of the municipality (for map)',
  })
  listPickupPoints(@CurrentUser() user: JwtPayload) {
    return this.fleet.listPickupPoints(user.municipalityId);
  }

  // ── Buses ────────────────────────────────────────────
  @Get('buses')
  @ApiOperation({ summary: 'List buses of municipality' })
  listBuses(@CurrentUser() user: JwtPayload) {
    return this.fleet.listBuses(user.municipalityId);
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

  // ── Drivers ──────────────────────────────────────────
  @Get('drivers')
  @ApiOperation({ summary: 'List drivers of municipality' })
  listDrivers(@CurrentUser() user: JwtPayload) {
    return this.fleet.listDrivers(user.municipalityId);
  }
}
