import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateMunicipalityDto {
  @ApiProperty({ example: 'Municipality of São Cristóvão' })
  @IsString()
  @IsNotEmpty()
  name: string;
}
