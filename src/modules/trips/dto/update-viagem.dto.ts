import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateViagemDto {
  @ApiPropertyOptional({ example: '2026-02-28' })
  dataViagem?: string;

  @ApiPropertyOptional({ example: 'M' })
  turno?: string;

  @ApiPropertyOptional({ enum: ['IDA', 'VOLTA'] })
  direcao?: 'IDA' | 'VOLTA';

  @ApiPropertyOptional({ example: 'uuid-da-linha' })
  idLinha?: string;

  @ApiPropertyOptional({ example: 'uuid-do-onibus' })
  idOnibus?: string;

  @ApiPropertyOptional({ example: 'uuid-do-motorista' })
  idMotorista?: string;

  @ApiPropertyOptional({ example: 40 })
  capacidadeReal?: number;

  @ApiPropertyOptional({ example: '2026-02-28T06:00:00Z' })
  aberturaVotacao?: string;

  @ApiPropertyOptional({ example: '2026-02-28T07:30:00Z' })
  fechamentoVotacao?: string;

  @ApiPropertyOptional({ example: ['uuid-lider1', 'uuid-lider2'] })
  lideresIds?: string[];

  @ApiPropertyOptional({
    enum: [
      'AGENDADA',
      'ABERTA_PARA_RESERVA',
      'EM_ANDAMENTO',
      'FINALIZADA',
      'CANCELADA',
    ],
  })
  status?:
    | 'AGENDADA'
    | 'ABERTA_PARA_RESERVA'
    | 'EM_ANDAMENTO'
    | 'FINALIZADA'
    | 'CANCELADA';
}
