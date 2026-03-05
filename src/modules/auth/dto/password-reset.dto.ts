import { ApiProperty } from '@nestjs/swagger';

export class PasswordRedefinitionDto {
  @ApiProperty({
    example: 'a1b2c3d4e5f6...',
    description: '64-character token from the reset email link',
  })
  token: string;

  @ApiProperty({
    example: 'newPassword123',
    minLength: 6,
    description: 'New password',
  })
  password: string;
}
