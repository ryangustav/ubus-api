import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEmail, MinLength } from 'class-validator';

export class CreateManagerDto {
  @ApiProperty({ example: 'uuid-of-municipality' })
  @IsString()
  @IsNotEmpty()
  municipalityId: string;

  @ApiProperty({ example: '12345678901' })
  @IsString()
  @IsNotEmpty()
  cpf: string;

  @ApiProperty({ example: 'John Manager' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'manager@municipality.gov.br' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: '11999999999' })
  @IsString()
  @IsOptional()
  phone?: string;
}
