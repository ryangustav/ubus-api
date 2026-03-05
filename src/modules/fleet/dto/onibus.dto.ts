import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOnibusDto {
  @ApiProperty({
    example: '20120',
    description: 'Bus identification number',
  })
  numeroIdentificacao: string;

  @ApiProperty({ example: 'ABC-1234' })
  placa: string;

  @ApiProperty({ example: 40, description: 'Number of seats' })
  capacidadePadrao: number;

  @ApiPropertyOptional({ example: true, description: 'Has bathroom' })
  temBanheiro?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Has air conditioning' })
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
    description: 'Active for capacity calculation',
  })
  active?: boolean;
}
