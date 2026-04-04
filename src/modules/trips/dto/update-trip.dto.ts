import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, IsDateString, IsArray, IsUUID } from 'class-validator';

export class UpdateTripDto {
  @ApiPropertyOptional({ example: 'uuid-of-municipality', description: 'Target municipality (SUPER_ADMIN only)' })
  @IsUUID()
  @IsOptional()
  municipalityId?: string;

  @ApiPropertyOptional({ example: '2026-02-28' })
  @IsString()
  @IsOptional()
  tripDate?: string;

  @ApiPropertyOptional({ example: 'MORNING' })
  @IsString()
  @IsOptional()
  shift?: string;

  @ApiPropertyOptional({ enum: ['OUTBOUND', 'INBOUND'] })
  @IsEnum(['OUTBOUND', 'INBOUND'])
  @IsOptional()
  direction?: 'OUTBOUND' | 'INBOUND';

  @ApiPropertyOptional({ example: 'uuid-of-route' })
  @IsString()
  @IsOptional()
  routeId?: string;

  @ApiPropertyOptional({ example: 'uuid-of-bus' })
  @IsString()
  @IsOptional()
  busId?: string;

  @ApiPropertyOptional({ example: 'uuid-of-driver' })
  @IsString()
  @IsOptional()
  driverId?: string;

  @ApiPropertyOptional({ example: 40 })
  @IsNumber()
  @IsOptional()
  realCapacity?: number;

  @ApiPropertyOptional({ example: '2026-02-28T06:00:00Z' })
  @IsDateString()
  @IsOptional()
  votingOpen?: string;

  @ApiPropertyOptional({ example: '2026-02-28T07:30:00Z' })
  @IsDateString()
  @IsOptional()
  votingClose?: string;

  @ApiPropertyOptional({ example: ['uuid-lider1', 'uuid-lider2'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  leaderIds?: string[];

  @ApiPropertyOptional({
    enum: [
      'SCHEDULED',
      'OPEN_FOR_RESERVATION',
      'ONGOING',
      'FINISHED',
      'CANCELLED',
    ],
  })
  @IsEnum([
    'SCHEDULED',
    'OPEN_FOR_RESERVATION',
    'ONGOING',
    'FINISHED',
    'CANCELLED',
  ])
  @IsOptional()
  status?:
    | 'SCHEDULED'
    | 'OPEN_FOR_RESERVATION'
    | 'ONGOING'
    | 'FINISHED'
    | 'CANCELLED';
}
