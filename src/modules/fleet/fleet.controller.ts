import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { FleetService } from './application/fleet.service';
import { CreateLinhaDto, UpdateLinhaDto } from './dto/linha.dto';
import { CreateOnibusDto, UpdateOnibusDto } from './dto/onibus.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/guards/roles.decorator';
import { LiderOnibusGuard } from '../../shared/guards/lider-onibus.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/infrastructure/strategies/jwt.strategy';

@ApiTags('fleet')
@Controller('fleet')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FleetController {
  constructor(private fleet: FleetService) {}

  @Get('linhas')
  @ApiOperation({ summary: 'Listar linhas/rotas da prefeitura' })
  listLinhas(@CurrentUser() user: JwtPayload) {
    return this.fleet.listLinhas(user.prefeituraId);
  }

  @Get('onibus')
  @ApiOperation({ summary: 'Listar ônibus da prefeitura' })
  listOnibus(@CurrentUser() user: JwtPayload) {
    return this.fleet.listOnibus(user.prefeituraId);
  }

  @Post('linhas')
  @UseGuards(RolesGuard)
  @Roles('GESTOR')
  @ApiOperation({ summary: 'Criar linha/rota (somente gestor)' })
  @ApiBody({ type: CreateLinhaDto })
  createLinha(@CurrentUser() user: JwtPayload, @Body() dto: CreateLinhaDto) {
    return this.fleet.createLinha(user.prefeituraId, dto);
  }

  @Patch('linhas/:id')
  @UseGuards(RolesGuard)
  @Roles('GESTOR')
  @ApiOperation({ summary: 'Atualizar linha/rota (somente gestor)' })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: UpdateLinhaDto })
  updateLinha(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateLinhaDto,
  ) {
    return this.fleet.updateLinha(user.prefeituraId, id, dto);
  }

  @Get('onibus/meus')
  @UseGuards(RolesGuard)
  @Roles('MOTORISTA')
  @ApiOperation({ summary: 'Listar ônibus que o motorista cadastrou' })
  listMeusOnibus(@CurrentUser() user: JwtPayload) {
    return this.fleet.listOnibusByMotorista(user.prefeituraId, user.sub);
  }

  @Post('onibus')
  @UseGuards(RolesGuard)
  @Roles('MOTORISTA', 'GESTOR')
  @ApiOperation({ summary: 'Criar ônibus (motorista ou gestor). Motorista: salva idMotorista.' })
  @ApiBody({ type: CreateOnibusDto })
  createOnibus(@CurrentUser() user: JwtPayload, @Body() dto: CreateOnibusDto) {
    const idMotorista = user.role === 'MOTORISTA' ? user.sub : undefined;
    return this.fleet.createOnibus(user.prefeituraId, dto, idMotorista);
  }

  @Patch('onibus/:id')
  @UseGuards(LiderOnibusGuard)
  @ApiOperation({ summary: 'Atualizar ônibus (motorista, gestor ou líder da rota)' })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: UpdateOnibusDto })
  updateOnibus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateOnibusDto,
  ) {
    return this.fleet.updateOnibus(user.prefeituraId, id, dto);
  }
}
