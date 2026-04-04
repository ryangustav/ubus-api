import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, Length } from 'class-validator';

export const passwordRedefinitionSchema = z.object({
  token: z.string().length(64, 'Token must be 64 characters'),
  password: z.string().min(6, 'Password must have at least 6 characters'),
});

export class PasswordRedefinitionDto {
  @ApiProperty({ example: '64-character-token-from-email' })
  @IsString()
  @Length(64, 64)
  token: string;

  @ApiProperty({ example: 'newpassword123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}
