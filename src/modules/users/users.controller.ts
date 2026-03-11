import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './application/users.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/guards/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/infrastructure/strategies/jwt.strategy';
import { ApiProperty } from '@nestjs/swagger';

class UpdateStatusDto {
  @ApiProperty({ enum: ['APROVADO', 'REJEITADO'] })
  status!: 'APROVADO' | 'REJEITADO';
}

@ApiTags('users')
@Controller('usuarios')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('pendentes')
  @UseGuards(RolesGuard)
  @Roles('GESTOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List pending users (manager approval)' })
  listPendentes(@CurrentUser() user: JwtPayload) {
    return this.users.listPendentes(user.municipalityId);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('GESTOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Approve or reject user registration' })
  @ApiParam({ name: 'id' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['APROVADO', 'REJEITADO'] },
      },
    },
  })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.users.updateStatus(id, dto.status, user.municipalityId);
  }
}
