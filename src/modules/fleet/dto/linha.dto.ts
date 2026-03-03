import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLinhaDto {
  @ApiProperty({ example: 'UFS - Centro' })
  nome: string;

  @ApiPropertyOptional({ example: 'Linha noturna para o campus' })
  descricao?: string;

  @ApiProperty({ example: [1, 2, 3, 4, 5], description: 'Dias da semana: 0=dom, 1=seg, 2=ter, 3=qua, 4=qui, 5=sex, 6=sab' })
  diasDaSemana: number[];

  @ApiProperty({ example: '06:00', description: 'Horário que abre votação para marcar lugares (HH:mm)' })
  horarioAberturaVotacao: string;

  @ApiProperty({ example: '07:30', description: 'Horário que finaliza votação para marcar lugares (HH:mm)' })
  horarioFechamentoVotacao: string;
}

export class UpdateLinhaDto {
  @ApiPropertyOptional({ example: 'UFS - Centro' })
  nome?: string;

  @ApiPropertyOptional({ example: 'Linha noturna para o campus' })
  descricao?: string;

  @ApiPropertyOptional({ example: [1, 2, 3, 4, 5] })
  diasDaSemana?: number[];

  @ApiPropertyOptional({ example: '06:00' })
  horarioAberturaVotacao?: string;

  @ApiPropertyOptional({ example: '07:30' })
  horarioFechamentoVotacao?: string;

  @ApiPropertyOptional({ example: true })
  isAtivo?: boolean;
}
