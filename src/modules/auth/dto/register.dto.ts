import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'uuid-of-municipality',
    description: 'Municipality ID (tenant)',
  })
  municipalityId: string;

  @ApiProperty({
    example: '12345678901',
    description: 'CPF (numbers only or formatted)',
  })
  cpf: string;

  @ApiProperty({ example: 'Maria Silva' })
  name: string;

  @ApiProperty({ example: 'maria@email.com' })
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  password: string;

  @ApiPropertyOptional({ example: '11999999999' })
  phone?: string;

  @ApiPropertyOptional({
    enum: ['MANAGER', 'DRIVER', 'LEADER', 'STUDENT', 'RIDE_SHARE'],
    default: 'STUDENT',
  })
  role?: 'MANAGER' | 'DRIVER' | 'LEADER' | 'STUDENT' | 'RIDE_SHARE';

  @ApiPropertyOptional({
    example: 1,
    description: '1: Titular, 2: Univ. Caronista, 3: Caronista Comum',
  })
  priorityLevel?: number;

  @ApiPropertyOptional({
    example: 'uuid-of-route',
    description:
      'For ALUNO only. Manager and Driver do not have. Student of one route can be ride-share on another.',
  })
  defaultRouteId?: string;

  @ApiPropertyOptional({ default: false })
  needsWheelchair?: boolean;

  @ApiPropertyOptional({ example: 'https://storage.com/photo.jpg' })
  photoUrl?: string;

  @ApiPropertyOptional({ example: 'https://storage.com/grade.pdf' })
  gradeFileUrl?: string;

  @ApiPropertyOptional({ example: 'https://storage.com/residencia.pdf' })
  residenciaFileUrl?: string;
}
