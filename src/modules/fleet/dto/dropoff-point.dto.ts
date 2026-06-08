import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateDropoffPointDto {
  @ApiProperty({ example: 'Parada do Campus Universitário' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: -10.9472, description: 'Latitude' })
  @IsNumber()
  @IsOptional()
  lat?: number;

  @ApiPropertyOptional({ example: -37.0731, description: 'Longitude' })
  @IsNumber()
  @IsOptional()
  lng?: number;

  @ApiPropertyOptional({
    example: 'Av. Principal, 100',
    description: 'Full address',
  })
  @IsString()
  @IsOptional()
  address?: string;
}

export class UpdateDropoffPointDto {
  @ApiPropertyOptional({ example: 'Novo Nome do Ponto' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: -10.95 })
  @IsNumber()
  @IsOptional()
  lat?: number;

  @ApiPropertyOptional({ example: -37.07 })
  @IsNumber()
  @IsOptional()
  lng?: number;

  @ApiPropertyOptional({ example: 'Av. Principal, 100' })
  @IsString()
  @IsOptional()
  address?: string;
}
