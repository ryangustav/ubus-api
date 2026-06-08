import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, Matches } from 'class-validator';

export enum VerificationChannel {
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
}

export enum VerificationContext {
  CHANGE_EMAIL = 'CHANGE_EMAIL',
  RESET_PASSWORD = 'RESET_PASSWORD',
  REGISTER = 'REGISTER',
}

export class SendVerificationCodeDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email address or phone number' })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({ enum: VerificationChannel, example: 'EMAIL' })
  @IsEnum(VerificationChannel)
  channel: VerificationChannel;

  @ApiProperty({ enum: VerificationContext, example: 'REGISTER' })
  @IsEnum(VerificationContext)
  context: VerificationContext;
}

export class VerifyCodeDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email address or phone number' })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({ example: '123456', description: '6-digit verification code' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'Code must be exactly 6 digits' })
  code: string;

  @ApiProperty({ enum: VerificationChannel, example: 'EMAIL' })
  @IsEnum(VerificationChannel)
  channel: VerificationChannel;

  @ApiProperty({ enum: VerificationContext, example: 'REGISTER' })
  @IsEnum(VerificationContext)
  context: VerificationContext;
}
