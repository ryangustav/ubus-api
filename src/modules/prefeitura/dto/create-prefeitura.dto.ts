import { ApiProperty } from '@nestjs/swagger';

export class CreatePrefeituraDto {
  @ApiProperty({ example: 'Prefeitura Municipal de São Cristóvão' })
  nome: string;
}
