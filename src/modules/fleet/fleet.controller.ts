import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { FleetService } from './application/fleet.service';
import { CreateRouteDto, UpdateRouteDto } from './dto/route.dto';
import { CreateBusDto, UpdateBusDto, BusLayoutDto } from './dto/bus.dto';
import { CreatePointDto, UpdatePointDto } from './dto/point.dto';
import { CreateDropoffPointDto, UpdateDropoffPointDto } from './dto/dropoff-point.dto';
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

  @Patch('routes/:id/bus')
  @UseGuards(RolesGuard)
  @Roles('MANAGER')
  @ApiOperation({ summary: 'Assign a default bus to a route (manager only)' })
  @ApiParam({ name: 'id', description: 'Route ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { busId: { type: 'string', nullable: true } },
      required: ['busId'],
    },
  })
  assignBus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: { busId: string | null },
  ) {
    return this.fleet.updateRoute(user.municipalityId, id, { busId: dto.busId });
  }

  @Patch('routes/:id/driver')
  @UseGuards(RolesGuard)
  @Roles('MANAGER')
  @ApiOperation({ summary: 'Assign a default driver to a route (manager only)' })
  @ApiParam({ name: 'id', description: 'Route ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { driverId: { type: 'string', nullable: true } },
      required: ['driverId'],
    },
  })
  assignDriver(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: { driverId: string | null },
  ) {
    return this.fleet.updateRoute(user.municipalityId, id, { driverId: dto.driverId });
  }

  @Delete('routes/:id')
  @UseGuards(RolesGuard)
  @Roles('MANAGER')
  @HttpCode(204)
  @ApiOperation({ summary: 'Excluir rota (apenas gestores da mesma municipalidade ou super-admin)' })
  @ApiParam({ name: 'id', description: 'ID da rota a ser excluída (UUID)' })
  @ApiResponse({ status: 204, description: 'A rota foi excluída com sucesso.' })
  @ApiResponse({ status: 400, description: 'Não é possível excluir uma rota ativa. Desative-a antes de excluir.' })
  @ApiResponse({ status: 404, description: 'Rota não encontrada.' })
  @ApiResponse({ status: 409, description: 'Não é possível excluir a rota pois existem viagens futuras planejadas.' })
  async deleteRoute(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<void> {
    await this.fleet.deleteRoute(id, user.municipalityId, user.role);
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
  deletePoint(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.fleet.deletePoint(id, user.municipalityId);
  }

  // ── Dropoff Points ───────────────────────────────────
  @Get('routes/:routeId/dropoff-points')
  @ApiOperation({ summary: 'List drop-off points of a route' })
  @ApiParam({ name: 'routeId', description: 'Route ID' })
  listDropoffPoints(@Param('routeId') routeId: string) {
    return this.fleet.listDropoffPointsByRoute(routeId);
  }

  @Post('routes/:routeId/dropoff-points')
  @UseGuards(RolesGuard)
  @Roles('MANAGER')
  @ApiOperation({ summary: 'Create drop-off point on a route' })
  @ApiParam({ name: 'routeId', description: 'Route ID' })
  @ApiBody({ type: CreateDropoffPointDto })
  createDropoffPoint(
    @Param('routeId') routeId: string,
    @Body() dto: CreateDropoffPointDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.fleet.createDropoffPoint(routeId, dto, user.municipalityId);
  }

  @Patch('dropoff-points/:pointId')
  @UseGuards(RolesGuard)
  @Roles('MANAGER')
  @ApiOperation({ summary: 'Update drop-off point' })
  @ApiParam({ name: 'pointId', description: 'Point ID' })
  @ApiBody({ type: UpdateDropoffPointDto })
  updateDropoffPoint(
    @Param('pointId') id: string,
    @Body() dto: UpdateDropoffPointDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.fleet.updateDropoffPoint(id, dto, user.municipalityId);
  }

  @Delete('dropoff-points/:pointId')
  @UseGuards(RolesGuard)
  @Roles('MANAGER')
  @ApiOperation({ summary: 'Delete drop-off point' })
  @ApiParam({ name: 'pointId', description: 'Point ID' })
  deleteDropoffPoint(@Param('pointId') id: string, @CurrentUser() user: JwtPayload) {
    return this.fleet.deleteDropoffPoint(id, user.municipalityId);
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

  @Get('buses/:id')
  @ApiOperation({ summary: 'Get bus details by ID' })
  @ApiParam({ name: 'id' })
  findOneBus(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.fleet.findOneBus(user.municipalityId, id, user.role);
  }

  @Post('buses')
  @UseGuards(RolesGuard)
  @Roles('DRIVER', 'MANAGER')
  @ApiOperation({
    summary: 'Create bus (driver or manager). Driver: saves driverId.',
  })
  @ApiBody({ type: CreateBusDto })
  createBus(@CurrentUser() user: JwtPayload, @Body() dto: CreateBusDto) {
    const isManagerOrAdmin = user.role === 'MANAGER' || user.role === 'SUPER_ADMIN';
    const municipalityId = (isManagerOrAdmin && dto.municipalityId)
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
    const isManagerOrAdmin = user.role === 'MANAGER' || user.role === 'SUPER_ADMIN';
    const municipalityId = (isManagerOrAdmin && dto.municipalityId)
      ? dto.municipalityId
      : user.municipalityId;
    return this.fleet.updateBus(municipalityId, id, dto);
  }

  @Put('buses/:id/layout')
  @UseGuards(RolesGuard)
  @Roles('DRIVER', 'MANAGER')
  @ApiOperation({ summary: 'Create or replace seat layout of a bus' })
  @ApiParam({ name: 'id', description: 'Bus ID' })
  @ApiBody({ type: BusLayoutDto })
  updateBusLayout(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: BusLayoutDto,
  ) {
    return this.fleet.updateBusLayout(id, user, dto);
  }

  @Get('buses/:id/layout')
  @ApiOperation({ summary: 'Get seat layout of a bus' })
  @ApiParam({ name: 'id', description: 'Bus ID' })
  getBusLayout(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.fleet.getBusLayout(id, user.municipalityId, user.role);
  }

  // ── Drivers ──────────────────────────────────────────
  @Get('drivers')
  @ApiOperation({ summary: 'List drivers of municipality' })
  listDrivers(@CurrentUser() user: JwtPayload) {
    return this.fleet.listDrivers(user.municipalityId);
  }
}
