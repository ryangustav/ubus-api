import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, IsInt, Min, Max, IsBoolean, Matches } from 'class-validator';

export class CreateRouteDto {
  @ApiProperty({ example: 'UFS - Centro' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Night route to campus' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: [1, 2, 3, 4, 5],
    description: 'Weekdays: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat',
  })
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  weekDays: number[];

  @ApiProperty({
    example: '06:00',
    description: 'Time voting opens for seat selection (HH:mm)',
  })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):?([0-5]\d)$/, {
    message: 'Must be a valid time in HH:mm format',
  })
  votingOpenTime: string;

  @ApiProperty({
    example: '07:30',
    description: 'Time voting closes for seat selection (HH:mm)',
  })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):?([0-5]\d)$/, {
    message: 'Must be a valid time in HH:mm format',
  })
  votingCloseTime: string;
}

export class UpdateRouteDto {
  @ApiPropertyOptional({ example: 'UFS - Centro' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Night route to campus' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: [1, 2, 3, 4, 5] })
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  @IsOptional()
  weekDays?: number[];

  @ApiPropertyOptional({ example: '06:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):?([0-5]\d)$/, {
    message: 'Must be a valid time in HH:mm format',
  })
  @IsOptional()
  votingOpenTime?: string;

  @ApiPropertyOptional({ example: '07:30' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):?([0-5]\d)$/, {
    message: 'Must be a valid time in HH:mm format',
  })
  @IsOptional()
  votingCloseTime?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
