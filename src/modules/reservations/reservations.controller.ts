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
  @ApiOperation({ summary: 'Reservar vaga (somente aluno)' })
  @ApiBody({ type: CreateReservationDto })
  create(
    @Req() req: { user: { sub: string } },
    @Body() dto: CreateReservationDto,
  ) {
    return this.reservations.create({ ...dto, idUsuario: req.user.sub });
  }

  @Get('viagem/:idViagem')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar reservas da viagem' })
  @ApiParam({ name: 'idViagem', example: '20260228-20120-M' })
  listPorViagem(@Param('idViagem') idViagem: string) {
    return this.reservations.findByViagem(idViagem);
  }

  @Get('viagem/:idViagem/assentos-ocupados')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assentos ocupados (para mapa)' })
  @ApiParam({ name: 'idViagem', example: '20260228-20120-M' })
  getAssentosOcupados(@Param('idViagem') idViagem: string) {
    return this.reservations.getAssentosOcupados(idViagem);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ver reserva por ID' })
  @ApiParam({ name: 'id', example: 'uuid' })
  findOne(@Param('id') id: string) {
    return this.reservations.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ALUNO')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar assento (somente aluno)' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiBody({ type: UpdateReservationDto })
  update(
    @Req() req: { user: { sub: string } },
    @Param('id') id: string,
    @Body() dto: UpdateReservationDto,
  ) {
    return this.reservations.update(id, dto, req.user.sub);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ALUNO')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancelar passagem (somente aluno)' })
  @ApiParam({ name: 'id', example: 'uuid' })
  remove(@Req() req: { user: { sub: string } }, @Param('id') id: string) {
    return this.reservations.remove(id, req.user.sub);
  }
}
