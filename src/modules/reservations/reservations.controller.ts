import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ReservationsService } from './application/reservations.service';
import { CreateReserveDto, UpdateReservationDto } from './dto/reserve.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/guards/roles.decorator';

@ApiTags('reservations')
@Controller('reservations')
export class ReservationsController {
  constructor(private reservations: ReservationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reserve seat (student only)' })
  @ApiBody({ type: CreateReserveDto })
  create(
    @Req() req: { user: { sub: string } },
    @Body() dto: CreateReserveDto,
  ) {
    return this.reservations.create({
      tripId: dto.tripId,
      userId: req.user.sub,
      seatNumber: dto.seatNumber ?? undefined,
      isRideShare: dto.isRideShare,
    });
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my reservations with trip details' })
  listMyReservations(@Req() req: { user: { sub: string } }) {
    return this.reservations.findMyReservations(req.user.sub);
  }

  @Get('trip/:tripId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List trip reservations' })
  @ApiParam({ name: 'tripId', example: '20260228-20120-M' })
  listByTrip(@Param('tripId') tripId: string) {
    return this.reservations.findByTrip(tripId);
  }

  @Get('trip/:tripId/occupied-seats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Occupied seats (for map)' })
  @ApiParam({ name: 'tripId', example: '20260228-20120-M' })
  getOccupiedSeats(@Param('tripId') tripId: string) {
    return this.reservations.getOccupiedSeats(tripId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get reservation by ID' })
  @ApiParam({ name: 'id', example: 'uuid' })
  findOne(@Param('id') id: string) {
    return this.reservations.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update seat (student only)' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiBody({ type: UpdateReservationDto })
  update(
    @Req() req: { user: { sub: string } },
    @Param('id') id: string,
    @Body() dto: UpdateReservationDto,
  ) {
    return this.reservations.update(
      id,
      { seatNumber: dto.seatNumber, status: dto.status },
      req.user.sub,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel reservation (student only)' })
  @ApiParam({ name: 'id', example: 'uuid' })
  remove(@Req() req: { user: { sub: string } }, @Param('id') id: string) {
    return this.reservations.remove(id, req.user.sub);
  }
}
