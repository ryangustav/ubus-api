import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  IsUUID,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsUrl,
} from 'class-validator';

export const registerSchema = z.object({
  municipalityId: z.string().uuid('Invalid municipality ID'),
  cpf: z.string().regex(/^\d{11}$|^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'Invalid CPF'),
  name: z.string().min(2, 'Name must have at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must have at least 6 characters'),
  phone: z.string().optional(),
  role: z
    .enum(['MANAGER', 'DRIVER', 'LEADER', 'STUDENT', 'RIDE_SHARE'])
    .optional()
    .default('STUDENT'),
  priorityLevel: z.number().int().min(1).max(3).optional(),
  defaultRouteId: z.string().uuid('Invalid route ID').optional(),
  needsWheelchair: z.boolean().optional().default(false),
  photoUrl: z.string().url('Invalid photo URL').optional(),
  gradeFileUrl: z.string().url('Invalid grade file URL').optional(),
  residenciaFileUrl: z.string().url('Invalid residence proof URL').optional(),
});

export class RegisterDto {
  @ApiProperty({ example: 'uuid-of-municipality', description: 'Municipality ID' })
  @IsUUID()
  municipalityId: string;

  @ApiProperty({ example: '12345678901', description: 'CPF (numbers only)' })
  @IsString()
  cpf: string;

  @ApiProperty({ example: 'Maria Silva' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'maria@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: '11999999999' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    enum: ['MANAGER', 'DRIVER', 'LEADER', 'STUDENT', 'RIDE_SHARE'],
    default: 'STUDENT',
  })
  @IsEnum(['MANAGER', 'DRIVER', 'LEADER', 'STUDENT', 'RIDE_SHARE'])
  @IsOptional()
  role?: 'MANAGER' | 'DRIVER' | 'LEADER' | 'STUDENT' | 'RIDE_SHARE';

  @ApiPropertyOptional({ example: 1, description: '1: Holder, 2: Univ. Caronista, 3: Common Caronista' })
  @IsInt()
  @Min(1)
  @Max(3)
  @IsOptional()
  priorityLevel?: number;

  @ApiPropertyOptional({ example: 'uuid-of-route' })
  @IsUUID()
  @IsOptional()
  defaultRouteId?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  needsWheelchair?: boolean;

  @ApiPropertyOptional({ example: 'https://storage.com/photo.jpg' })
  @IsUrl()
  @IsOptional()
  photoUrl?: string;

  @ApiPropertyOptional({ example: 'https://storage.com/grade.pdf' })
  @IsUrl()
  @IsOptional()
  gradeFileUrl?: string;

  @ApiPropertyOptional({ example: 'https://storage.com/residencia.pdf' })
  @IsUrl()
  @IsOptional()
  residenciaFileUrl?: string;
}
