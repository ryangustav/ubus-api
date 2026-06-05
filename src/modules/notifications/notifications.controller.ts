import {
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
  ParseUUIDPipe,
  Body,
  Post,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiResponse,
  ApiProperty,
} from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { NotificationsService } from './application/notifications.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/guards/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/infrastructure/strategies/jwt.strategy';

export class SendNotificationDto {
  @ApiProperty({ example: 'Alerta de Atraso' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'O ônibus da rota Centro atrasará 15 minutos.' })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiProperty({ enum: ['MUNICIPALITY', 'ROUTE'], example: 'ROUTE' })
  @IsEnum(['MUNICIPALITY', 'ROUTE'])
  @IsNotEmpty()
  target!: 'MUNICIPALITY' | 'ROUTE';

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Municipality or Route UUID',
  })
  @IsUUID()
  @IsNotEmpty()
  targetId!: string;
}

export class SendNotificationResponseDto {
  @ApiProperty({ example: 12 })
  recipientCount!: number;
}

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for logged in user' })
  listMine(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.listByUser(user.sub);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notificationsService.markAsRead(id, user.sub);
  }

  @Post('send')
  @UseGuards(RolesGuard)
  @Roles('MANAGER', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Send a notification to a municipality or specific route',
  })
  @ApiBody({ type: SendNotificationDto })
  @ApiResponse({
    status: 201,
    type: SendNotificationResponseDto,
    description: 'Notification sent',
  })
  send(@CurrentUser() user: JwtPayload, @Body() dto: SendNotificationDto) {
    return this.notificationsService.sendNotification(
      dto,
      user.municipalityId,
      user.role,
    );
  }
}
