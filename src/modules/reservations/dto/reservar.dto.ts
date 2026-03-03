import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReservationDto {
  @ApiProperty({ example: '20260228-20120-M' })
  idViagem: string;

  @ApiPropertyOptional({ description: 'Ignorado: usa o usuário autenticado' })
  idUsuario?: string;

  @ApiPropertyOptional({ example: 15, description: '1-40. Omitir = ônibus de excesso' })
  numeroAssento?: number | null;

  @ApiPropertyOptional({ example: false, description: 'true = caronista (pode ser cortado na guilhotina)' })
  isCarona?: boolean;
}

export class UpdateReservationDto {
  @ApiPropertyOptional({ example: 15, description: 'Trocar assento (1-40)' })
  numeroAssento?: number | null;

  @ApiPropertyOptional({ enum: ['CONFIRMADA', 'PRESENTE', 'FALTOU', 'CANCELADA_SISTEMA', 'EXCESSO'] })
  status?: 'CONFIRMADA' | 'PRESENTE' | 'FALTOU' | 'CANCELADA_SISTEMA' | 'EXCESSO';
}
