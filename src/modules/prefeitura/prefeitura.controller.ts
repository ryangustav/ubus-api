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
import { PrefeituraService } from './application/prefeitura.service';
import { CreatePrefeituraDto } from './dto/create-prefeitura.dto';
import { UpdatePrefeituraDto } from './dto/update-prefeitura.dto';
import { CreateGestorDto } from './dto/create-gestor.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/guards/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/infrastructure/strategies/jwt.strategy';

@ApiTags('prefeitura')
@Controller('prefeitura')
export class PrefeituraController {
  constructor(private prefeitura: PrefeituraService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cadastrar nova cidade (somente super-admin)' })
  @ApiBody({ type: CreatePrefeituraDto })
  create(@Body() dto: CreatePrefeituraDto) {
    return this.prefeitura.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar prefeituras (super-admin vê todas, outros só a sua)',
  })
  list(@CurrentUser() user: JwtPayload) {
    const isSuperAdmin = user.role === 'SUPER_ADMIN';
    return this.prefeitura.list({
      excluirSistema: true,
      idPrefeitura: isSuperAdmin ? undefined : user.prefeituraId,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buscar prefeitura por ID' })
  @ApiParam({ name: 'id' })
  findById(@Param('id') id: string) {
    return this.prefeitura.findById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Atualizar prefeitura - pausar/ativar cidade (somente super-admin)',
  })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: UpdatePrefeituraDto })
  update(@Param('id') id: string, @Body() dto: UpdatePrefeituraDto) {
    return this.prefeitura.update(id, dto);
  }

  @Post('gestores')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cadastrar gestor em uma prefeitura (somente super-admin)',
  })
  @ApiBody({ type: CreateGestorDto })
  createGestor(@Body() dto: CreateGestorDto) {
    return this.prefeitura.createGestor(dto);
  }

  @Delete(':id/gestor')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Remover gestor da prefeitura (somente super-admin)',
  })
  @ApiParam({ name: 'id' })
  removeGestor(@Param('id') id: string) {
    return this.prefeitura.removeGestor(id);
  }
}
