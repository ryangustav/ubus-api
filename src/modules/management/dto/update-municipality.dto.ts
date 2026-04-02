import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateMunicipalityDto {
  @ApiPropertyOptional({ example: 'Municipality' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Pause/activate city (super-admin)',
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
