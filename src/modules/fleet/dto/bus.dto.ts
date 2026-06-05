import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsBoolean, IsUUID, IsArray } from 'class-validator';

export class CreateBusDto {
  @ApiPropertyOptional({ example: 'uuid-of-municipality', description: 'Target municipality (SUPER_ADMIN only)' })
  @IsUUID()
  @IsOptional()
  municipalityId?: string;

  @ApiProperty({
    example: '20120',
    description: 'Bus identification number',
  })
  @IsString()
  @IsNotEmpty()
  identificationNumber: string;

  @ApiProperty({ example: 'ABC-1234' })
  @IsString()
  @IsNotEmpty()
  plate: string;

  @ApiProperty({ example: 40, description: 'Number of seats' })
  @IsInt()
  @Min(1)
  standardCapacity: number;

  @ApiPropertyOptional({ example: true, description: 'Has bathroom' })
  @IsBoolean()
  @IsOptional()
  hasBathroom?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Has air conditioning' })
  @IsBoolean()
  @IsOptional()
  hasAirConditioning?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Has elevator for accessibility' })
  @IsBoolean()
  @IsOptional()
  hasElevator?: boolean;

  @ApiPropertyOptional({ example: [1, 2, 3, 4], description: 'Preferential seat numbers' })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  preferentialSeats?: number[];
}

export class UpdateBusDto {
  @ApiPropertyOptional({ example: 'uuid-of-municipality', description: 'Target municipality (SUPER_ADMIN only)' })
  @IsUUID()
  @IsOptional()
  municipalityId?: string;

  @ApiPropertyOptional({ example: '20120' })
  @IsString()
  @IsOptional()
  identificationNumber?: string;

  @ApiPropertyOptional({ example: 'ABC-1234' })
  @IsString()
  @IsOptional()
  plate?: string;

  @ApiPropertyOptional({ example: 40 })
  @IsInt()
  @Min(1)
  @IsOptional()
  standardCapacity?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  hasBathroom?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  hasAirConditioning?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Has elevator for accessibility' })
  @IsBoolean()
  @IsOptional()
  hasElevator?: boolean;

  @ApiPropertyOptional({ example: [1, 2, 3, 4], description: 'Preferential seat numbers' })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  preferentialSeats?: number[];

  @ApiPropertyOptional({
    example: true,
    description: 'Active for capacity calculation',
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
