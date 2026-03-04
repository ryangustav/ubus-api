import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOnibusDto {
  @ApiProperty({
    example: '20120',
    description: 'Número de identificação do ônibus',
  })
  numeroIdentificacao: string;

  @ApiProperty({ example: 'ABC-1234' })
  placa: string;

  @ApiProperty({ example: 40, description: 'Quantidade de lugares' })
  capacidadePadrao: number;

  @ApiPropertyOptional({ example: true, description: 'Tem banheiro' })
  temBanheiro?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Tem ar condicionado' })
  temArCondicionado?: boolean;
}

export class UpdateOnibusDto {
  @ApiPropertyOptional({ example: '20120' })
  numeroIdentificacao?: string;

  @ApiPropertyOptional({ example: 'ABC-1234' })
  placa?: string;

  @ApiPropertyOptional({ example: 40 })
  capacidadePadrao?: number;

  @ApiPropertyOptional({ example: true })
  temBanheiro?: boolean;

  @ApiPropertyOptional({ example: true })
  temArCondicionado?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Ativo para fins de cálculo de capacidade',
  })
  isAtivo?: boolean;
}
