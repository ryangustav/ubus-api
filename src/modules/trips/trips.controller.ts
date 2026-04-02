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
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
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
    return this.trips.listOpenTrips();
  }

  @Get(':tripId')
  @ApiOperation({ summary: 'Get trip by Smart Key' })
  @ApiParam({ name: 'tripId', example: '20260228-20120-M' })
  getTrip(@Param('tripId') tripId: string) {
    return this.trips.getTrip(tripId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create trip (manager only)' })
  @ApiBody({ type: CreateTripDto })
  createTrip(@Body() dto: CreateTripDto) {
    return this.trips.createTrip(dto);
  }

  @Patch(':tripId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update trip (manager only)' })
  @ApiParam({ name: 'tripId' })
  @ApiBody({ type: UpdateTripDto })
  updateTrip(@Param('tripId') tripId: string, @Body() dto: UpdateTripDto) {
    return this.trips.updateTrip(tripId, dto);
  }

  @Post(':tripId/confirmation-alert')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trigger confirmation alert (leader/driver)' })
  @ApiParam({ name: 'tripId' })
  triggerAlert(
    @Param('tripId') tripId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.trips.triggerConfirmationAlert(
      tripId,
      user.sub,
      user.municipalityId,
    );
  }

  @Post(':tripId/finish-and-punish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm absences and apply penalties (leader)' })
  @ApiParam({ name: 'tripId' })
  finishAndPunish(
    @Param('tripId') tripId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.trips.finishAndPunish(tripId, user.sub, user.municipalityId);
  }

  @Post(':tripId/relocation')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Relocate students to another trip (leader)' })
  @ApiParam({ name: 'tripId' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { destinationTripId: { type: 'string' } },
      required: ['destinationTripId'],
    },
  })
  relocation(
    @Param('tripId') tripId: string,
    @Body() body: { destinationTripId: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.trips.relocation(
      tripId,
      body.destinationTripId,
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

  @Get(':tripId/alert-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if confirmation alert is active' })
  @ApiParam({ name: 'tripId' })
  getAlertStatus(@Param('tripId') tripId: string) {
    return this.trips.getAlertStatus(tripId);
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
