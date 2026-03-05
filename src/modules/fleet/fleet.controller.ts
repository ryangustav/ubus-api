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

  @Get('routes')
  @ApiOperation({ summary: 'List routes of municipality' })
  listRoutes(@CurrentUser() user: JwtPayload) {
    return this.fleet.listLinhas(user.municipalityId);
  }

  @Get('buses')
  @ApiOperation({ summary: 'List buses of municipality' })
  listBuses(@CurrentUser() user: JwtPayload) {
    return this.fleet.listOnibus(user.municipalityId);
  }

  @Post('routes')
  @UseGuards(RolesGuard)
  @Roles('GESTOR')
  @ApiOperation({ summary: 'Create route (manager only)' })
  @ApiBody({ type: CreateLinhaDto })
  createLinha(@CurrentUser() user: JwtPayload, @Body() dto: CreateLinhaDto) {
    return this.fleet.createLinha(user.municipalityId, dto);
  }

  @Patch('routes/:id')
  @UseGuards(RolesGuard)
  @Roles('GESTOR')
  @ApiOperation({ summary: 'Update route (manager only)' })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: UpdateLinhaDto })
  updateLinha(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateLinhaDto,
  ) {
    return this.fleet.updateLinha(user.municipalityId, id, dto);
  }

  @Get('buses/mine')
  @UseGuards(RolesGuard)
  @Roles('MOTORISTA')
  @ApiOperation({ summary: 'List buses registered by driver' })
  listMyBuses(@CurrentUser() user: JwtPayload) {
    return this.fleet.listOnibusByMotorista(user.municipalityId, user.sub);
  }

  @Post('buses')
  @UseGuards(RolesGuard)
  @Roles('MOTORISTA', 'GESTOR')
  @ApiOperation({
    summary: 'Create bus (driver or manager). Driver: saves driverId.',
  })
  @ApiBody({ type: CreateOnibusDto })
  createOnibus(@CurrentUser() user: JwtPayload, @Body() dto: CreateOnibusDto) {
    const idMotorista = user.role === 'MOTORISTA' ? user.sub : undefined;
    return this.fleet.createOnibus(user.municipalityId, dto, idMotorista);
  }

  @Patch('buses/:id')
  @UseGuards(LiderOnibusGuard)
  @ApiOperation({
    summary: 'Update bus (driver, manager or route leader)',
  })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: UpdateOnibusDto })
  updateOnibus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateOnibusDto,
  ) {
    return this.fleet.updateOnibus(user.municipalityId, id, dto);
  }
}
