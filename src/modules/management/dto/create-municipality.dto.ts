import { ApiProperty } from '@nestjs/swagger';

export class CreateMunicipalityDto {
  @ApiProperty({ example: 'Municipality of São Cristóvão' })
  name: string;
}
