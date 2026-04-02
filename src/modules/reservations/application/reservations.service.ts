import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DRIZZLE } from '../../../shared/database/database.module';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../../shared/database/schema';
import { eq, and, isNotNull, gte } from 'drizzle-orm';

@Injectable()
export class ReservationsService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  /**
   * Create: Reserve seat. seatNumber null = excess bus.
   * UNIQUE(trip_id, seat_number) avoids overbooking.
   */
  async create(dto: {
    tripId: string;
    userId: string;
    seatNumber?: number | null;
    isRideShare?: boolean;
  }) {
    const [trip] = await this.db
      .select()
      .from(schema.trips)
      .where(eq(schema.trips.id, dto.tripId));
    if (!trip) {
      throw new NotFoundException(`Trip "${dto.tripId}" not found`);
    }

    const isExcess = dto.seatNumber == null;
    if (isExcess) {
      const occupied = await this.getOccupiedSeats(dto.tripId);
      if (occupied.length < trip.actualCapacity) {
        throw new BadRequestException(
          `Excess voting only opens when capacity is full (${occupied.length}/${trip.actualCapacity})`,
        );
      }
    }
    try {
      const [reservation] = await this.db
        .insert(schema.reservations)
        .values({
          tripId: dto.tripId,
          userId: dto.userId,
          seatNumber: dto.seatNumber ?? null,
          isRideShare: dto.isRideShare ?? false,
          status: isExcess ? 'EXCESS' : 'CONFIRMED',
        })
        .returning();
      return reservation;
    } catch (error: any) {
      if (error.code === '23505') {
        throw new ConflictException('Seat already taken');
      }
      throw error;
    }
  }

  async findOne(id: string) {
    const [reservation] = await this.db
      .select()
      .from(schema.reservations)
      .where(eq(schema.reservations.id, id));
    if (!reservation) throw new NotFoundException('Reservation not found');
    return reservation;
  }

  async findMyReservations(userId: string) {
    const rows = await this.db
      .select({
        reservation: schema.reservations,
        trip: schema.trips,
      })
      .from(schema.reservations)
      .innerJoin(
        schema.trips,
        eq(schema.reservations.tripId, schema.trips.id),
      )
      .where(
        and(
          eq(schema.reservations.userId, userId),
          gte(schema.trips.tripDate, new Date().toISOString().slice(0, 10)),
        ),
      );
    return rows.map((r) => ({
      ...r.reservation,
      trip: r.trip,
    }));
  }

  async findByTrip(tripId: string) {
    const rows = await this.db
      .select({
        reservation: schema.reservations,
        user: {
          id: schema.users.id,
          name: schema.users.name,
          cpf: schema.users.cpf,
        },
      })
      .from(schema.reservations)
      .innerJoin(
        schema.users,
        eq(schema.reservations.userId, schema.users.id),
      )
      .where(eq(schema.reservations.tripId, tripId));

    return rows.map((r) => ({
      ...r.reservation,
      user: r.user,
    }));
  }

  async getOccupiedSeats(tripId: string): Promise<number[]> {
    const rows = await this.db
      .select({ seatNumber: schema.reservations.seatNumber })
      .from(schema.reservations)
      .where(
        and(
          eq(schema.reservations.tripId, tripId),
          isNotNull(schema.reservations.seatNumber),
        ),
      );
    return rows
      .map((r) => r.seatNumber)
      .filter((n): n is number => n != null);
  }

  /**
   * Update: Change seat or status. If userId provided, only allows if owner.
   */
  async update(
    id: string,
    dto: {
      seatNumber?: number | null;
      status?: (typeof schema.reservations.$inferSelect)['status'];
    },
    userId?: string,
  ) {
    const [exists] = await this.db
      .select()
      .from(schema.reservations)
      .where(eq(schema.reservations.id, id));
    if (!exists) throw new NotFoundException('Reservation not found');
    if (userId && exists.userId !== userId) {
      throw new ForbiddenException('Can only update your own reservation');
    }
    const [reservation] = await this.db
      .update(schema.reservations)
      .set({
        ...(dto.seatNumber !== undefined && {
          seatNumber: dto.seatNumber,
        }),
        ...(dto.status !== undefined && { status: dto.status }),
      })
      .where(eq(schema.reservations.id, id))
      .returning();
    return reservation;
  }

  /**
   * Delete: Cancel reservation (remove and free seat). If userId provided, only allows if owner.
   */
  async remove(id: string, userId?: string) {
    const [exists] = await this.db
      .select()
      .from(schema.reservations)
      .where(eq(schema.reservations.id, id));
    if (!exists) throw new NotFoundException('Reservation not found');
    if (userId && exists.userId !== userId) {
      throw new ForbiddenException('Can only cancel your own reservation');
    }
    const [reservation] = await this.db
      .delete(schema.reservations)
      .where(eq(schema.reservations.id, id))
      .returning();
    return reservation;
  }
}
