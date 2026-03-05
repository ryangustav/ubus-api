import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMunicipalityDto {
  @ApiPropertyOptional({ example: 'Municipality' })
  name?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Pause/activate city (super-admin)',
  })
  active?: boolean;
}
