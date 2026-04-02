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
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  status!: 'APPROVED' | 'REJECTED';
}

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles('MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List pending users (manager approval)' })
  listPending(@CurrentUser() user: JwtPayload) {
    return this.users.listPending(user.municipalityId);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Approve or reject user registration' })
  @ApiParam({ name: 'id' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['APPROVED', 'REJECTED'] },
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

  @Patch('me/point')
  @ApiOperation({ summary: 'Update my default pick-up point' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { pointId: { type: 'string', format: 'uuid' } },
      required: ['pointId'],
    },
  })
  updatePoint(
    @CurrentUser() user: JwtPayload,
    @Body('pointId') pointId: string,
  ) {
    return this.users.updatePoint(user.sub, pointId);
  }
}
