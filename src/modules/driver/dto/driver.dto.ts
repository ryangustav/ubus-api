import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class DriverAssignmentPayloadDto {
  @ApiProperty({ example: 'uuid-of-bus' })
  @IsUUID()
  @IsNotEmpty()
  busId!: string;

  @ApiProperty({ example: '2026-06-05', description: 'YYYY-MM-DD' })
  @IsString()
  @IsNotEmpty()
  serviceDate!: string;
}

export class DriverDepartingPayloadDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  @IsOptional()
  departingNow?: boolean;
}
