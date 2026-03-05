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
import { CreateReservationDto, UpdateReservationDto } from './dto/reservar.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/guards/roles.decorator';

@ApiTags('reservations')
@Controller('reservations')
export class ReservationsController {
  constructor(private reservations: ReservationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ALUNO')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reserve seat (student only)' })
  @ApiBody({ type: CreateReservationDto })
  create(
    @Req() req: { user: { sub: string } },
    @Body() dto: CreateReservationDto,
  ) {
    return this.reservations.create({
      idViagem: dto.tripId,
      idUsuario: req.user.sub,
      numeroAssento: dto.seatNumber ?? undefined,
      isCarona: dto.rideShare,
    });
  }

  @Get('minhas')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my reservations with trip details' })
  listMinhas(@Req() req: { user: { sub: string } }) {
    return this.reservations.findMinhas(req.user.sub);
  }

  @Get('trip/:tripId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List trip reservations' })
  @ApiParam({ name: 'tripId', example: '20260228-20120-M' })
  listByTrip(@Param('tripId') tripId: string) {
    return this.reservations.findByViagem(tripId);
  }

  @Get('trip/:tripId/occupied-seats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Occupied seats (for map)' })
  @ApiParam({ name: 'tripId', example: '20260228-20120-M' })
  getOccupiedSeats(@Param('tripId') tripId: string) {
    return this.reservations.getAssentosOcupados(tripId);
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
  @Roles('ALUNO')
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
      { numeroAssento: dto.seatNumber, status: dto.status },
      req.user.sub,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ALUNO')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel reservation (student only)' })
  @ApiParam({ name: 'id', example: 'uuid' })
  remove(@Req() req: { user: { sub: string } }, @Param('id') id: string) {
    return this.reservations.remove(id, req.user.sub);
  }
}
