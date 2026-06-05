import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { DRIZZLE } from '../../shared/database/database.module';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../shared/database/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { CreateRatingDto } from './dto/create-rating.dto';

@Injectable()
export class RatingsService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async createRating(studentId: string, dto: CreateRatingDto) {
    // 1. Check if reservation exists and belongs to the student
    const [reservation] = await this.db
      .select()
      .from(schema.reservations)
      .where(
        and(
          eq(schema.reservations.id, dto.reservationId),
          eq(schema.reservations.userId, studentId),
        ),
      );

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.tripId !== dto.tripId) {
      throw new ForbiddenException('Reservation is not for this trip');
    }

    // 2. Check if trip exists and is finished
    const [trip] = await this.db
      .select()
      .from(schema.trips)
      .where(eq(schema.trips.id, dto.tripId));

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.status !== 'FINISHED') {
      throw new ForbiddenException('Trip is not finished yet');
    }

    // 3. Check if rating already exists for this reservation
    const [existing] = await this.db
      .select()
      .from(schema.ratings)
      .where(eq(schema.ratings.reservationId, dto.reservationId));

    if (existing) {
      throw new ConflictException('You have already rated this reservation');
    }

    // 4. Save rating
    const [rating] = await this.db
      .insert(schema.ratings)
      .values({
        reservationId: dto.reservationId,
        tripId: dto.tripId,
        userId: studentId,
        cleanlinessRating: dto.cleanlinessRating,
        punctualityRating: dto.punctualityRating,
        driverRating: dto.driverRating,
        comment: dto.comment ?? null,
      })
      .returning();

    return rating;
  }

  async getPendingRatings(studentId: string) {
    const pending = await this.db
      .select({
        reservation: schema.reservations,
        trip: schema.trips,
      })
      .from(schema.reservations)
      .innerJoin(schema.trips, eq(schema.reservations.tripId, schema.trips.id))
      .leftJoin(
        schema.ratings,
        eq(schema.reservations.id, schema.ratings.reservationId),
      )
      .where(
        and(
          eq(schema.reservations.userId, studentId),
          eq(schema.trips.status, 'FINISHED'),
          isNull(schema.ratings.id),
        ),
      );

    return pending.map((p) => ({
      ...p.reservation,
      trip: p.trip,
    }));
  }
}
