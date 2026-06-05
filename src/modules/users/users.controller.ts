import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { UsersService } from './application/users.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/guards/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/infrastructure/strategies/jwt.strategy';

class UpdateStatusDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsEnum(['APPROVED', 'REJECTED'])
  @IsNotEmpty()
  status!: 'APPROVED' | 'REJECTED';
}

class SubmitRenewalDto {
  @ApiProperty({ description: 'New grade/schedule document URL' })
  @IsString()
  @IsNotEmpty()
  gradeFileUrl!: string;

  @ApiPropertyOptional({ description: 'New residence proof URL' })
  @IsString()
  @IsOptional()
  residenciaFileUrl?: string;
}

class RequestAccessibilityDto {
  @ApiProperty({
    enum: [
      'PCD',
      'TEA',
      'IDOSO',
      'GESTANTE',
      'LACTANTE',
      'MOBILIDADE_REDUZIDA',
    ],
  })
  @IsEnum([
    'PCD',
    'TEA',
    'IDOSO',
    'GESTANTE',
    'LACTANTE',
    'MOBILIDADE_REDUZIDA',
  ])
  @IsNotEmpty()
  reason!: string;

  @ApiProperty({ description: 'Proof document URL' })
  @IsString()
  @IsNotEmpty()
  proofDocUrl!: string;
}

class ReviewAccessibilityDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsEnum(['APPROVED', 'REJECTED'])
  @IsNotEmpty()
  status!: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({ description: 'Review note' })
  @IsString()
  @IsOptional()
  note?: string;
}

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private users: UsersService) {}

  // ── List / Filter ────────────────────────────────────
  @Get()
  @UseGuards(RolesGuard)
  @Roles('MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List users with optional filters' })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'status', required: false })
  listUsers(
    @CurrentUser() user: JwtPayload,
    @Query('role') role?: string,
    @Query('status') status?: string,
  ) {
    return this.users.listUsers(user.municipalityId, { role, status });
  }

  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles('MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List pending users (manager approval)' })
  listPending(@CurrentUser() user: JwtPayload) {
    return this.users.listPending(user.municipalityId);
  }

  // ── Profile ──────────────────────────────────────────
  @Get('me')
  @ApiOperation({ summary: 'Get my profile' })
  getMe(@CurrentUser() user: JwtPayload) {
    return this.users.getMe(user.sub);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update my profile (name, phone, photo, etc.)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        phone: { type: 'string' },
        photoUrl: { type: 'string' },
        needsWheelchair: { type: 'boolean' },
      },
    },
  })
  updateMe(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      name?: string;
      phone?: string;
      photoUrl?: string;
      needsWheelchair?: boolean;
    },
  ) {
    return this.users.updateMe(user.sub, body);
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

  // ── Approval ─────────────────────────────────────────
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
    return this.users.updateStatus(
      id,
      dto.status,
      user.municipalityId,
      user.role,
    );
  }

  // ── Semester Renewal ─────────────────────────────────
  @Post('me/renewal')
  @ApiOperation({ summary: 'Submit semester renewal request' })
  @ApiBody({ type: SubmitRenewalDto })
  submitRenewal(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SubmitRenewalDto,
  ) {
    return this.users.submitRenewal(user.sub, dto);
  }

  @Patch(':id/renewal')
  @UseGuards(RolesGuard)
  @Roles('MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Approve or reject renewal request' })
  @ApiParam({ name: 'id' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['APPROVED', 'REJECTED'] },
      },
    },
  })
  reviewRenewal(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.users.reviewRenewal(id, dto.status, user.municipalityId);
  }

  // ── Accessibility ────────────────────────────────────
  @Post('me/accessibility')
  @ApiOperation({ summary: 'Request preferential/accessibility seat' })
  @ApiBody({ type: RequestAccessibilityDto })
  requestAccessibility(
    @CurrentUser() user: JwtPayload,
    @Body() dto: RequestAccessibilityDto,
  ) {
    return this.users.requestAccessibility(user.sub, dto);
  }

  @Get('accessibility/pending')
  @UseGuards(RolesGuard)
  @Roles('MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List users with pending accessibility review' })
  listAccessibilityPending(@CurrentUser() user: JwtPayload) {
    return this.users.listAccessibilityPending(user.municipalityId);
  }

  @Patch(':id/accessibility')
  @UseGuards(RolesGuard)
  @Roles('MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Approve or reject accessibility request' })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: ReviewAccessibilityDto })
  reviewAccessibility(
    @Param('id') id: string,
    @Body() dto: ReviewAccessibilityDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.users.reviewAccessibility(id, dto, user.municipalityId);
  }

  // ── Soft Delete ──────────────────────────────────────
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Soft delete user' })
  @ApiParam({ name: 'id' })
  softDeleteUser(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.users.softDelete(id, user.municipalityId, user.role);
  }
}
