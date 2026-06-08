import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsBoolean,
  IsUUID,
  IsArray,
  IsEnum,
  ValidateNested,
  Max,
} from 'class-validator';

export enum NumberingMode {
  VIRTUAL = 'VIRTUAL',
  PHYSICAL = 'PHYSICAL',
  MIXED = 'MIXED',
}

export enum NumerationSide {
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

export enum CellType {
  SEAT = 'SEAT',
  AISLE = 'AISLE',
  EMPTY = 'EMPTY',
  BATHROOM = 'BATHROOM',
  BOX = 'BOX',
}

export enum CellPosition {
  WINDOW_LEFT = 'WINDOW_LEFT',
  AISLE_LEFT = 'AISLE_LEFT',
  CENTER = 'CENTER',
  AISLE_RIGHT = 'AISLE_RIGHT',
  WINDOW_RIGHT = 'WINDOW_RIGHT',
}

export class BusCellDto {
  @ApiProperty({ example: 1, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  col: number;

  @ApiProperty({ enum: CellType, example: 'SEAT' })
  @IsEnum(CellType)
  type: string;

  @ApiPropertyOptional({ example: 1, nullable: true })
  @IsInt()
  @IsOptional()
  virtualNumber: number | null;

  @ApiPropertyOptional({ example: 1, nullable: true })
  @IsInt()
  @IsOptional()
  physicalNumber: number | null;

  @ApiPropertyOptional({ enum: CellPosition, example: 'WINDOW_LEFT', nullable: true })
  @IsEnum(CellPosition)
  @IsOptional()
  position: string | null;

  @ApiProperty({ example: false })
  @IsBoolean()
  isDpm: boolean;
}

export class BusRowDto {
  @ApiProperty({ type: [BusCellDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BusCellDto)
  cells: BusCellDto[];
}

export class BusLayoutDto {
  @ApiProperty({ enum: NumberingMode, example: 'PHYSICAL' })
  @IsEnum(NumberingMode)
  numberingMode: string;

  @ApiProperty({ enum: NumerationSide, example: 'LEFT' })
  @IsEnum(NumerationSide)
  numerationSide: string;

  @ApiPropertyOptional({ example: 2, nullable: true })
  @IsInt()
  @IsOptional()
  dpmSeatVirtualNumber: number | null;

  @ApiProperty({ example: [2], type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  preferentialSeats: number[];

  @ApiProperty({ type: [BusRowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BusRowDto)
  rows: BusRowDto[];
}

export class CreateBusDto {
  @ApiPropertyOptional({
    example: 'uuid-of-municipality',
    description: 'Target municipality (SUPER_ADMIN only)',
  })
  @IsUUID()
  @IsOptional()
  municipalityId?: string;

  @ApiProperty({
    example: '20120',
    description: 'Bus identification number',
  })
  @IsString()
  @IsNotEmpty()
  identificationNumber: string;

  @ApiProperty({ example: 'ABC-1234' })
  @IsString()
  @IsNotEmpty()
  plate: string;

  @ApiProperty({ example: 40, description: 'Number of seats' })
  @IsInt()
  @Min(1)
  standardCapacity: number;

  @ApiPropertyOptional({ example: true, description: 'Has bathroom' })
  @IsBoolean()
  @IsOptional()
  hasBathroom?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Has air conditioning' })
  @IsBoolean()
  @IsOptional()
  hasAirConditioning?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Has elevator for accessibility',
  })
  @IsBoolean()
  @IsOptional()
  hasElevator?: boolean;

  @ApiPropertyOptional({
    example: [1, 2, 3, 4],
    description: 'Preferential seat numbers',
  })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  preferentialSeats?: number[];

  @ApiPropertyOptional({ type: () => BusLayoutDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BusLayoutDto)
  seatLayout?: BusLayoutDto;
}

export class UpdateBusDto {
  @ApiPropertyOptional({
    example: 'uuid-of-municipality',
    description: 'Target municipality (SUPER_ADMIN only)',
  })
  @IsUUID()
  @IsOptional()
  municipalityId?: string;

  @ApiPropertyOptional({ example: '20120' })
  @IsString()
  @IsOptional()
  identificationNumber?: string;

  @ApiPropertyOptional({ example: 'ABC-1234' })
  @IsString()
  @IsOptional()
  plate?: string;

  @ApiPropertyOptional({ example: 40 })
  @IsInt()
  @Min(1)
  @IsOptional()
  standardCapacity?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  hasBathroom?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  hasAirConditioning?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Has elevator for accessibility',
  })
  @IsBoolean()
  @IsOptional()
  hasElevator?: boolean;

  @ApiPropertyOptional({
    example: [1, 2, 3, 4],
    description: 'Preferential seat numbers',
  })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  preferentialSeats?: number[];

  @ApiPropertyOptional({
    example: true,
    description: 'Active for capacity calculation',
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
