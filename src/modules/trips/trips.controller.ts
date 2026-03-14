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
import { TripsService } from './application/trips.service';
import { CreateViagemDto } from './dto/create-viagem.dto';
import { UpdateViagemDto } from './dto/update-viagem.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/guards/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/infrastructure/strategies/jwt.strategy';

@ApiTags('trips')
@Controller('trips')
export class TripsController {
  constructor(private trips: TripsService) {}

  @Get('open')
  @ApiOperation({ summary: 'Trips with open voting (student can see)' })
  listOpen() {
    return this.trips.listViagensAbertas();
  }

  @Get(':tripId')
  @ApiOperation({ summary: 'Get trip by Smart Key' })
  @ApiParam({ name: 'tripId', example: '20260228-20120-M' })
  getTrip(@Param('tripId') tripId: string) {
    return this.trips.getViagem(tripId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('GESTOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create trip (manager only)' })
  @ApiBody({ type: CreateViagemDto })
  createViagem(@Body() dto: CreateViagemDto) {
    return this.trips.createViagem(dto);
  }

  @Patch(':tripId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('GESTOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update trip (manager only)' })
  @ApiParam({ name: 'tripId' })
  @ApiBody({ type: UpdateViagemDto })
  updateTrip(
    @Param('tripId') tripId: string,
    @Body() dto: UpdateViagemDto,
  ) {
    return this.trips.updateViagem(tripId, dto);
  }

  @Post(':tripId/alerta-confirmacao')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trigger confirmation alert (leader/driver)' })
  @ApiParam({ name: 'tripId' })
  triggerAlerta(@Param('tripId') tripId: string, @CurrentUser() user: JwtPayload) {
    return this.trips.triggerAlertaConfirmacao(
      tripId,
      user.sub,
      user.municipalityId,
    );
  }

  @Post(':tripId/encerrar-e-punir')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm absences and apply penalties (leader)' })
  @ApiParam({ name: 'tripId' })
  encerrarEPunir(@Param('tripId') tripId: string, @CurrentUser() user: JwtPayload) {
    return this.trips.encerrarEPunir(tripId, user.sub, user.municipalityId);
  }

  @Post(':tripId/transbordo')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Relocate students to another trip (leader)' })
  @ApiParam({ name: 'tripId' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { tripIdDestino: { type: 'string' } },
      required: ['tripIdDestino'],
    },
  })
  transbordo(
    @Param('tripId') tripId: string,
    @Body() body: { tripIdDestino: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.trips.transbordo(
      tripId,
      body.tripIdDestino,
      user.sub,
      user.municipalityId,
    );
  }

  @Get(':tripId/location')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get trip location (for map)' })
  @ApiParam({ name: 'tripId' })
  getLocation(@Param('tripId') tripId: string) {
    return this.trips.getLocation(tripId);
  }

  @Get(':tripId/alerta-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if confirmation alert is active' })
  @ApiParam({ name: 'tripId' })
  getAlertaStatus(@Param('tripId') tripId: string) {
    return this.trips.getAlertaStatus(tripId);
  }

  @Patch(':tripId/location')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update trip location (driver/leader)' })
  @ApiParam({ name: 'tripId' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { lat: { type: 'number' }, lng: { type: 'number' } },
      required: ['lat', 'lng'],
    },
  })
  updateLocation(
    @Param('tripId') tripId: string,
    @Body() body: { lat: number; lng: number },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.trips.updateLocation(
      tripId,
      body.lat,
      body.lng,
      user.sub,
      user.municipalityId,
    );
  }
}
