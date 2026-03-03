import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGestorDto {
  @ApiProperty({ example: 'uuid-da-prefeitura' })
  idPrefeitura: string;

  @ApiProperty({ example: '12345678901' })
  cpf: string;

  @ApiProperty({ example: 'João Gestor' })
  nome: string;

  @ApiProperty({ example: 'gestor@prefeitura.gov.br' })
  email: string;

  @ApiProperty({ example: 'senha123', minLength: 6 })
  senha: string;

  @ApiPropertyOptional({ example: '11999999999' })
  telefone?: string;
}
