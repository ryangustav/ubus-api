import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsDateString, IsArray, IsUUID } from 'class-validator';

export class CreateTripDto {
  @ApiPropertyOptional({ example: 'uuid-of-municipality', description: 'Target municipality (SUPER_ADMIN only)' })
  @IsUUID()
  @IsOptional()
  municipalityId?: string;

  @ApiProperty({
    example: '20260228-20120-M',
    description: 'Smart Key: YYYYMMDD-BUS-SHIFT',
  })
  @IsString()
  @IsNotEmpty()
  tripId: string;

  @ApiProperty({ example: '2026-02-28' })
  @IsString()
  @IsNotEmpty()
  tripDate: string;

  @ApiProperty({
    example: 'MORNING',
    description: 'MORNING, AFTERNOON, NIGHT',
  })
  @IsString()
  @IsNotEmpty()
  shift: string;

  @ApiProperty({ enum: ['OUTBOUND', 'INBOUND'] })
  @IsEnum(['OUTBOUND', 'INBOUND'])
  direction: 'OUTBOUND' | 'INBOUND';

  @ApiProperty({ example: 'uuid-of-route' })
  @IsString()
  @IsNotEmpty()
  routeId: string;

  @ApiProperty({ example: 'uuid-of-bus' })
  @IsString()
  @IsNotEmpty()
  busId: string;

  @ApiPropertyOptional({ example: 'uuid-of-driver' })
  @IsString()
  @IsOptional()
  driverId?: string;

  @ApiProperty({
    example: 40,
    description: 'Actual capacity (can be altered by driver)',
  })
  @IsNumber()
  realCapacity: number;

  @ApiProperty({ example: '2026-02-28T06:00:00Z', description: 'ISO 8601' })
  @IsDateString()
  votingOpen: string;

  @ApiProperty({ example: '2026-02-28T07:30:00Z', description: 'ISO 8601' })
  @IsDateString()
  votingClose: string;

  @ApiPropertyOptional({
    example: ['uuid-lider1', 'uuid-lider2'],
    description: 'Leader IDs (seats 1-4)',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  leaderIds?: string[];
}
