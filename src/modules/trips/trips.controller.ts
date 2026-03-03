import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { TripsService } from './application/trips.service';
import { CreateViagemDto } from './dto/create-viagem.dto';
import { UpdateViagemDto } from './dto/update-viagem.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/guards/roles.decorator';

@ApiTags('trips')
@Controller('trips')
export class TripsController {
  constructor(private trips: TripsService) {}

  @Get('abertas')
  @ApiOperation({ summary: 'Viagens com votação aberta (aluno pode ver)' })
  listAbertas() {
    return this.trips.listViagensAbertas();
  }

  @Get(':idViagem')
  @ApiOperation({ summary: 'Buscar viagem por Smart Key' })
  @ApiParam({ name: 'idViagem', example: '20260228-20120-M' })
  getViagem(@Param('idViagem') idViagem: string) {
    return this.trips.getViagem(idViagem);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('GESTOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar viagem (somente gestor)' })
  @ApiBody({ type: CreateViagemDto })
  createViagem(@Body() dto: CreateViagemDto) {
    return this.trips.createViagem(dto);
  }

  @Patch(':idViagem')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('GESTOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar viagem (somente gestor)' })
  @ApiParam({ name: 'idViagem' })
  @ApiBody({ type: UpdateViagemDto })
  updateViagem(@Param('idViagem') idViagem: string, @Body() dto: UpdateViagemDto) {
    return this.trips.updateViagem(idViagem, dto);
  }
}
