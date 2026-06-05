import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsUUID,
  IsString,
  IsInt,
  Min,
  Max,
  IsOptional,
} from 'class-validator';

export class CreateRatingDto {
  @ApiProperty({ example: 'uuid-of-reservation' })
  @IsUUID()
  @IsNotEmpty()
  reservationId!: string;

  @ApiProperty({ example: '20260605-101-M' })
  @IsString()
  @IsNotEmpty()
  tripId!: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  cleanlinessRating!: number;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  punctualityRating!: number;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  driverRating!: number;

  @ApiPropertyOptional({ example: 'Great ride!' })
  @IsString()
  @IsOptional()
  comment?: string;
}
