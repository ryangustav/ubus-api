import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLinhaDto {
  @ApiProperty({ example: 'UFS - Centro' })
  nome: string;

  @ApiPropertyOptional({ example: 'Night route to campus' })
  descricao?: string;

  @ApiProperty({
    example: [1, 2, 3, 4, 5],
    description: 'Weekdays: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat',
  })
  diasDaSemana: number[];

  @ApiProperty({
    example: '06:00',
    description: 'Time voting opens for seat selection (HH:mm)',
  })
  horarioAberturaVotacao: string;

  @ApiProperty({
    example: '07:30',
    description: 'Time voting closes for seat selection (HH:mm)',
  })
  horarioFechamentoVotacao: string;
}

export class UpdateLinhaDto {
  @ApiPropertyOptional({ example: 'UFS - Centro' })
  nome?: string;

  @ApiPropertyOptional({ example: 'Night route to campus' })
  descricao?: string;

  @ApiPropertyOptional({ example: [1, 2, 3, 4, 5] })
  diasDaSemana?: number[];

  @ApiPropertyOptional({ example: '06:00' })
  horarioAberturaVotacao?: string;

  @ApiPropertyOptional({ example: '07:30' })
  horarioFechamentoVotacao?: string;

  @ApiPropertyOptional({ example: true })
  active?: boolean;
}
