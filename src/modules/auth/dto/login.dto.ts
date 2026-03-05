import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'maria@email.com' })
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  password: string;
}
