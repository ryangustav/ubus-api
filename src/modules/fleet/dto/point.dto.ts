import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsNumber,
} from 'class-validator';

export class CreatePointDto {
  @ApiProperty({ example: 'Praça Central' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 1, description: 'Order in the route' })
  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;

  @ApiPropertyOptional({ example: -10.91, description: 'Latitude' })
  @IsNumber()
  @IsOptional()
  lat?: number;

  @ApiPropertyOptional({ example: -37.07, description: 'Longitude' })
  @IsNumber()
  @IsOptional()
  lng?: number;

  @ApiPropertyOptional({
    example: 'Av. Brasil, 123',
    description: 'Full address',
  })
  @IsString()
  @IsOptional()
  address?: string;
}

export class UpdatePointDto {
  @ApiPropertyOptional({ example: 'Praça Central' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;

  @ApiPropertyOptional({ example: -10.91 })
  @IsNumber()
  @IsOptional()
  lat?: number;

  @ApiPropertyOptional({ example: -37.07 })
  @IsNumber()
  @IsOptional()
  lng?: number;

  @ApiPropertyOptional({ example: 'Av. Brasil, 123' })
  @IsString()
  @IsOptional()
  address?: string;
}
