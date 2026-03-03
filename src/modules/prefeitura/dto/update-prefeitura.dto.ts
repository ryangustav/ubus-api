import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePrefeituraDto {
  @ApiPropertyOptional({ example: 'Prefeitura Municipal' })
  nome?: string;

  @ApiPropertyOptional({ example: true, description: 'Pausar/ativar cidade (super-admin)' })
  ativo?: boolean;
}
