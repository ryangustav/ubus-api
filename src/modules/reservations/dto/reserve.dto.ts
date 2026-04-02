import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, Min, IsEnum } from 'class-validator';

export class CreateReserveDto {
  @ApiProperty({ example: '20260228-20120-M' })
  @IsString()
  @IsNotEmpty()
  tripId: string;

  @ApiPropertyOptional({ description: 'Ignored: uses authenticated user' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({
    example: 15,
    description: '1-40. Omit = excess bus',
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  seatNumber?: number | null;

  @ApiPropertyOptional({
    example: false,
    description: 'true = ride-share (can be cut in guillotine)',
  })
  @IsBoolean()
  @IsOptional()
  isRideShare?: boolean;
}

export class UpdateReservationDto {
  @ApiPropertyOptional({ example: 15, description: 'Change seat (1-40)' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  seatNumber?: number | null;

  @ApiPropertyOptional({
    enum: [
      'CONFIRMED',
      'PRESENT',
      'ABSENT',
      'CANCELLED_BY_SYSTEM',
      'EXCESS',
    ],
  })
  @IsEnum([
    'CONFIRMED',
    'PRESENT',
    'ABSENT',
    'CANCELLED_BY_SYSTEM',
    'EXCESS',
  ])
  @IsOptional()
  status?:
    | 'CONFIRMED'
    | 'PRESENT'
    | 'ABSENT'
    | 'CANCELLED_BY_SYSTEM'
    | 'EXCESS';
}
