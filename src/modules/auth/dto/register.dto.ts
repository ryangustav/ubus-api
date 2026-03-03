import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'uuid-da-prefeitura', description: 'ID da prefeitura (tenant)' })
  idPrefeitura: string;

  @ApiProperty({ example: '12345678901', description: 'CPF (apenas números ou formatado)' })
  cpf: string;

  @ApiProperty({ example: 'Maria Silva' })
  nome: string;

  @ApiProperty({ example: 'maria@email.com' })
  email: string;

  @ApiProperty({ example: 'senha123', minLength: 6 })
  senha: string;

  @ApiPropertyOptional({ example: '11999999999' })
  telefone?: string;

  @ApiPropertyOptional({
    enum: ['GESTOR', 'MOTORISTA', 'LIDER', 'ALUNO', 'CARONISTA'],
    default: 'ALUNO',
  })
  role?: 'GESTOR' | 'MOTORISTA' | 'LIDER' | 'ALUNO' | 'CARONISTA';

  @ApiPropertyOptional({ example: 1, description: '1: Titular, 2: Univ. Caronista, 3: Caronista Comum' })
  nivelPrioridade?: number;

  @ApiPropertyOptional({ example: 'uuid-da-linha', description: 'Apenas para ALUNO. Gestor e Motorista não têm. Aluno de uma linha pode ser caronista em outra.' })
  idLinhaPadrao?: string;
}
