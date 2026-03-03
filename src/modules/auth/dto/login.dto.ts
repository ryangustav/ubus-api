import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'maria@email.com' })
  email: string;

  @ApiProperty({ example: 'senha123', minLength: 6 })
  senha: string;
}
