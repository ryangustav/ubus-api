import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsUUID,
} from 'class-validator';

export class ScheduleTripsDto {
  @ApiProperty({
    example: 'uuid-of-municipality',
    description: 'Municipality ID (SUPER_ADMIN only)',
  })
  @IsUUID()
  @IsOptional()
  municipalityId?: string;

  @ApiProperty({ example: 'uuid-of-route' })
  @IsUUID()
  routeId: string;

  @ApiProperty({
    example: '2026-06-01',
    description: 'Start date (YYYY-MM-DD)',
  })
  @IsString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ example: '2026-06-30', description: 'End date (YYYY-MM-DD)' })
  @IsString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({ example: 'uuid-of-bus' })
  @IsUUID()
  busId: string;

  @ApiPropertyOptional({ example: 'uuid-of-driver' })
  @IsUUID()
  @IsOptional()
  driverId?: string;

  @ApiProperty({ example: 'MORNING', description: 'MORNING, AFTERNOON, NIGHT' })
  @IsString()
  @IsNotEmpty()
  shift: string;

  @ApiProperty({ enum: ['OUTBOUND', 'INBOUND'] })
  @IsEnum(['OUTBOUND', 'INBOUND'])
  direction: 'OUTBOUND' | 'INBOUND';

  @ApiProperty({ example: 40 })
  @IsNumber()
  realCapacity: number;
}
