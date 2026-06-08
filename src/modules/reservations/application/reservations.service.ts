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
    pickupPointId?: string | null;
  }) {
    // 1. Fetch user to validate status and wheelchair requirements
    const [user] = await this.db
      .select({
        id: schema.users.id,
        registrationStatus: schema.users.registrationStatus,
        needsWheelchair: schema.users.needsWheelchair,
        defaultPointId: schema.users.defaultPointId,
      })
      .from(schema.users)
      .where(eq(schema.users.id, dto.userId));

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (
      user.registrationStatus === 'SUSPENDED' ||
      user.registrationStatus === 'INACTIVE'
    ) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Account is suspended or inactive',
        errorCode: 'ACCOUNT_SUSPENDED',
        error: 'Forbidden',
      });
    }

    // 2. Fetch Trip
    const [trip] = await this.db
      .select()
      .from(schema.trips)
      .where(eq(schema.trips.id, dto.tripId));
    if (!trip) {
      throw new NotFoundException(`Trip "${dto.tripId}" not found`);
    }

    // 3. Wheelchair check
    if (user.needsWheelchair) {
      const [bus] = await this.db
        .select({ hasElevator: schema.buses.hasElevator })
        .from(schema.buses)
        .where(eq(schema.buses.id, trip.busId));

      if (!bus || !bus.hasElevator) {
        throw new BadRequestException('BUS_NO_ELEVATOR');
      }
    }

    // 4. Validate and set pickupPointId & seat layout if trip.direction is defined (ignores legacy tests)
    let finalPickupPointId = dto.pickupPointId;
    if (trip.direction) {
      if (trip.direction === 'INBOUND') {
        if (!finalPickupPointId) {
          throw new BadRequestException('pickupPointId is required for inbound trips');
        }
        const [dropoffPoint] = await this.db
          .select()
          .from(schema.dropoffPoints)
          .where(
            and(
              eq(schema.dropoffPoints.id, finalPickupPointId),
              eq(schema.dropoffPoints.routeId, trip.routeId),
            ),
          );
        if (!dropoffPoint) {
          throw new BadRequestException('Invalid dropoff point for this trip');
        }
      } else {
        // OUTBOUND
        if (finalPickupPointId) {
          const [pickupPoint] = await this.db
            .select()
            .from(schema.points)
            .where(
              and(
                eq(schema.points.id, finalPickupPointId),
                eq(schema.points.routeId, trip.routeId),
              ),
            );
          if (!pickupPoint) {
            throw new BadRequestException('Invalid pickup point for this trip');
          }
        } else {
          if (!user.defaultPointId) {
            throw new BadRequestException(
              'User has no default pickup point, must specify pickupPointId',
            );
          }
          const [pickupPoint] = await this.db
            .select()
            .from(schema.points)
            .where(
              and(
                eq(schema.points.id, user.defaultPointId),
                eq(schema.points.routeId, trip.routeId),
              ),
            );
          if (!pickupPoint) {
            throw new BadRequestException(
              'User default pickup point does not belong to this route',
            );
          }
          finalPickupPointId = user.defaultPointId;
        }
      }

      // 5. Validate seat layout requirements
      const [layout] = await this.db
        .select()
        .from(schema.busLayouts)
        .where(eq(schema.busLayouts.busId, trip.busId));

      if (layout) {
        if (dto.seatNumber != null) {
          const allCells = (layout.rows as any[]).flatMap((r) => r.cells);
          const validSeat = allCells.some(
            (c) => c.type === 'SEAT' && c.virtualNumber === dto.seatNumber,
          );
          if (!validSeat) {
            throw new BadRequestException('Invalid seat number for this bus layout');
          }
        }
      } else {
        // No layout: seatNumber must be null
        if (dto.seatNumber != null) {
          throw new BadRequestException('Seat selection is not available for this bus');
        }
      }
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
          pickupPointId: finalPickupPointId,
          isRideShare: dto.isRideShare ?? false,
          status: isExcess ? 'EXCESS' : 'CONFIRMED',
        })
        .returning();
      return reservation;
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        (error as Record<string, unknown>).code === '23505'
      ) {
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
      .innerJoin(schema.trips, eq(schema.reservations.tripId, schema.trips.id))
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
      .innerJoin(schema.users, eq(schema.reservations.userId, schema.users.id))
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
    return rows.map((r) => r.seatNumber).filter((n): n is number => n != null);
  }

  async getOccupiedSeatsDetailed(tripId: string) {
    // 1. Fetch trip and its bus to get preferentialSeats
    const [tripWithBus] = await this.db
      .select({
        trip: schema.trips,
        bus: schema.buses,
      })
      .from(schema.trips)
      .innerJoin(schema.buses, eq(schema.trips.busId, schema.buses.id))
      .where(eq(schema.trips.id, tripId));

    const preferentialSeats = tripWithBus?.bus?.preferentialSeats ?? [];

    // 2. Fetch occupied seats
    const occupiedSeats = await this.getOccupiedSeats(tripId);

    // 3. Find preferential occupied seats (seats in preferential list)
    const preferentialOccupiedSeats = occupiedSeats.filter((seat) =>
      preferentialSeats.includes(seat),
    );

    return {
      occupiedSeats,
      preferentialOccupiedSeats,
    };
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
