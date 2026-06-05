import { Controller, Get, Param, Post, Body, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FleetService } from './application/fleet.service';

@ApiTags('fleet')
@Controller('fleet')
export class FleetController {
  constructor(private readonly fleetService: FleetService) {}

  @Get('routes/:municipalityId')
  @ApiOperation({ summary: 'List routes by municipality' })
  listRoutes(@Param('municipalityId') municipalityId: string) {
    return this.fleetService.listRoutes(municipalityId);
  }

  @Get('buses/:municipalityId')
  @ApiOperation({ summary: 'List buses by municipality' })
  listBuses(@Param('municipalityId') municipalityId: string) {
    return this.fleetService.listBuses(municipalityId);
  }
}
