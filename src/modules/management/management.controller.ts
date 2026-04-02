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
import { ManagementService } from './application/management.service';
import { CreateMunicipalityDto } from './dto/create-municipality.dto';
import { UpdateMunicipalityDto } from './dto/update-municipality.dto';
import { CreateManagerDto } from './dto/create-manager.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/guards/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/infrastructure/strategies/jwt.strategy';

@ApiTags('management')
@Controller('management')
export class ManagementController {
  constructor(private management: ManagementService) {}

  @Get('public')
  @ApiOperation({ summary: 'List active municipalities (public)' })
  listPublic() {
    return this.management.listActivePublic();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register new municipality (super-admin only)' })
  @ApiBody({ type: CreateMunicipalityDto })
  create(@Body() dto: CreateMunicipalityDto) {
    return this.management.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List municipalities (super-admin sees all, others only theirs)',
  })
  list(@CurrentUser() user: JwtPayload) {
    const isSuperAdmin = user.role === 'SUPER_ADMIN';
    return this.management.list({
      excludeSystem: true,
      municipalityId: isSuperAdmin ? undefined : user.municipalityId,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get municipality by ID' })
  @ApiParam({ name: 'id' })
  findById(@Param('id') id: string) {
    return this.management.findById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update municipality - pause/activate city (super-admin only)',
  })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: UpdateMunicipalityDto })
  update(@Param('id') id: string, @Body() dto: UpdateMunicipalityDto) {
    return this.management.update(id, dto);
  }

  @Post('managers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Register manager in municipality (super-admin only)',
  })
  @ApiBody({ type: CreateManagerDto })
  createManager(@Body() dto: CreateManagerDto) {
    return this.management.createManager(dto);
  }

  @Delete(':id/manager')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Remove manager from municipality (super-admin only)',
  })
  @ApiParam({ name: 'id' })
  removeManager(@Param('id') id: string) {
    return this.management.removeManager(id);
  }
}
