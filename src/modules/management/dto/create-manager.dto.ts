import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateManagerDto {
  @ApiProperty({ example: 'uuid-of-municipality' })
  municipalityId: string;

  @ApiProperty({ example: '12345678901' })
  cpf: string;

  @ApiProperty({ example: 'John Manager' })
  name: string;

  @ApiProperty({ example: 'manager@municipality.gov.br' })
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  password: string;

  @ApiPropertyOptional({ example: '11999999999' })
  phone?: string;
}
