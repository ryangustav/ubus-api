import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateViagemDto {
  @ApiProperty({ example: '20260228-20120-M', description: 'Smart Key: YYYYMMDD-ONIBUS-TURNO' })
  idViagem: string;

  @ApiProperty({ example: '2026-02-28' })
  dataViagem: string;

  @ApiProperty({ example: 'M', description: 'MANHA, TARDE, NOITE (ou M, T, N)' })
  turno: string;

  @ApiProperty({ enum: ['IDA', 'VOLTA'] })
  direcao: 'IDA' | 'VOLTA';

  @ApiProperty({ example: 'uuid-da-linha' })
  idLinha: string;

  @ApiProperty({ example: 'uuid-do-onibus' })
  idOnibus: string;

  @ApiPropertyOptional({ example: 'uuid-do-motorista' })
  idMotorista?: string;

  @ApiProperty({ example: 40, description: 'Capacidade real (pode ser alterada pelo motorista)' })
  capacidadeReal: number;

  @ApiProperty({ example: '2026-02-28T06:00:00Z', description: 'ISO 8601' })
  aberturaVotacao: string;

  @ApiProperty({ example: '2026-02-28T07:30:00Z', description: 'ISO 8601' })
  fechamentoVotacao: string;

  @ApiPropertyOptional({ example: ['uuid-lider1', 'uuid-lider2'], description: 'IDs dos líderes (poltronas 1-4)' })
  lideresIds?: string[];
}
