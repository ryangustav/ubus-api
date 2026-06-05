import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: 'Maria Santos' })
  name!: string;

  @ApiProperty({ example: 'maria@email.com' })
  email!: string;

  @ApiProperty({ example: '***.*56.789-**' })
  cpf!: string;

  @ApiPropertyOptional({ example: '(**) * ****-1234' })
  phone?: string;

  @ApiProperty({
    example: 'STUDENT',
    enum: [
      'SUPER_ADMIN',
      'MANAGER',
      'DRIVER',
      'LEADER',
      'STUDENT',
      'RIDE_SHARE',
    ],
  })
  role!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  municipalityId!: string;

  @ApiProperty({
    example: 'APPROVED',
    enum: [
      'PENDING',
      'APPROVED',
      'REJECTED',
      'RENEWAL_PENDING',
      'SUSPENDED',
      'INACTIVE',
    ],
  })
  status!: string;

  @ApiPropertyOptional({
    example: 1,
    description: '1: Holder, 2: Caronista Univ., 3: Common Caronista',
  })
  priorityLevel?: number;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  defaultRouteId?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  defaultPointId?: string;

  @ApiProperty({ example: false })
  needsWheelchair!: boolean;

  @ApiPropertyOptional({
    example: 'PCD',
    enum: [
      'PCD',
      'TEA',
      'IDOSO',
      'GESTANTE',
      'LACTANTE',
      'MOBILIDADE_REDUZIDA',
    ],
  })
  accessibilityReason?: string;

  @ApiPropertyOptional({ example: 'http://example.com/doc.pdf' })
  accessibilityDocUrl?: string;

  @ApiPropertyOptional({
    example: 'APPROVED',
    enum: ['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED', 'REVOKED'],
  })
  accessibilityStatus?: string;

  @ApiPropertyOptional({ example: '2026-06-05T12:00:00.000Z' })
  accessibilityApprovedAt?: string;

  @ApiPropertyOptional({ example: 'Document verified.' })
  accessibilityReviewNote?: string;

  @ApiProperty({ example: 0 })
  accessibilityConsecutivePeriods!: number;

  @ApiPropertyOptional({ example: 'http://example.com/photo.jpg' })
  photoUrl?: string;

  @ApiPropertyOptional({ example: 'http://example.com/grade.pdf' })
  gradeFileUrl?: string;

  @ApiPropertyOptional({ example: 'http://example.com/residence.pdf' })
  residenciaFileUrl?: string;

  @ApiPropertyOptional({ example: '2026-06-05T23:59:59.999Z' })
  expiresAt?: string;

  @ApiPropertyOptional({ example: '2026-06-19T23:59:59.999Z' })
  renewalDeadline?: string;

  @ApiPropertyOptional({ example: '2026-06-05T12:00:00.000Z' })
  renewalSubmittedAt?: string;

  @ApiPropertyOptional({ example: '2026-06-05T12:00:00.000Z' })
  createdAt?: string;
}
