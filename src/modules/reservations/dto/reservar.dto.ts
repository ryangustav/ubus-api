import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReservationDto {
  @ApiProperty({ example: '20260228-20120-M' })
  tripId: string;

  @ApiPropertyOptional({ description: 'Ignored: uses authenticated user' })
  userId?: string;

  @ApiPropertyOptional({
    example: 15,
    description: '1-40. Omit = excess bus',
  })
  seatNumber?: number | null;

  @ApiPropertyOptional({
    example: false,
    description: 'true = ride-share (can be cut in guillotine)',
  })
  rideShare?: boolean;
}

export class UpdateReservationDto {
  @ApiPropertyOptional({ example: 15, description: 'Change seat (1-40)' })
  seatNumber?: number | null;

  @ApiPropertyOptional({
    enum: ['CONFIRMADA', 'PRESENTE', 'FALTOU', 'CANCELADA_SISTEMA', 'EXCESSO'],
  })
  status?:
    | 'CONFIRMADA'
    | 'PRESENTE'
    | 'FALTOU'
    | 'CANCELADA_SISTEMA'
    | 'EXCESSO';
}
