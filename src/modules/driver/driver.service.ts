import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DRIZZLE } from '../../shared/database/database.module';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../shared/database/schema';
import { eq, and, gte, inArray } from 'drizzle-orm';
import { DriverAssignmentPayloadDto } from './dto/driver.dto';
import * as crypto from 'crypto';

@Injectable()
export class DriverService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async assignForToday(
    driverId: string,
    municipalityId: string,
    dto: DriverAssignmentPayloadDto,
  ) {
    const { busId, serviceDate } = dto;

    // 1. Check if bus exists and belongs to municipality
    const [bus] = await this.db
      .select()
      .from(schema.buses)
      .where(eq(schema.buses.id, busId));

    if (!bus) throw new NotFoundException('Bus not found');
    if (bus.municipalityId !== municipalityId) {
      throw new ForbiddenException('Bus belongs to another municipality');
    }

    // 2. Fetch scheduled trips on serviceDate for this busId
    const trips = await this.db
      .select()
      .from(schema.trips)
      .where(
        and(
          eq(schema.trips.busId, busId),
          eq(schema.trips.tripDate, serviceDate),
        ),
      );

    // 3. Update their driverId
    if (trips.length > 0) {
      await this.db
        .update(schema.trips)
        .set({ driverId })
        .where(
          and(
            eq(schema.trips.busId, busId),
            eq(schema.trips.tripDate, serviceDate),
          ),
        );
    }

    const tripOutId = trips.find((t) => t.direction === 'OUTBOUND')?.id ?? null;
    const tripBackId = trips.find((t) => t.direction === 'INBOUND')?.id ?? null;

    return {
      assignmentId: crypto.randomUUID(),
      tripOutId,
      tripBackId,
    };
  }

  async getCurrentTripSummary(driverId: string) {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // 1. Fetch all today or future trips assigned to this driver
    const driverTrips = await this.db
      .select()
      .from(schema.trips)
      .where(
        and(
          eq(schema.trips.driverId, driverId),
          gte(schema.trips.tripDate, todayStr),
        ),
      );

    // 2. Find active or next upcoming trip
    const activeOrUpcoming = driverTrips
      .filter((t) => t.status !== 'FINISHED' && t.status !== 'CANCELLED')
      .sort((a, b) => {
        if (a.status === 'ONGOING' && b.status !== 'ONGOING') return -1;
        if (b.status === 'ONGOING' && a.status !== 'ONGOING') return 1;
        if (a.tripDate < b.tripDate) return -1;
        if (a.tripDate > b.tripDate) return 1;
        return (
          (a.votingOpenAt?.getTime() ?? 0) - (b.votingOpenAt?.getTime() ?? 0)
        );
      });

    const currentTrip = activeOrUpcoming[0];
    if (!currentTrip) {
      return {
        phase: null,
        tripId: null,
        points: [],
      };
    }

    // 3. Count student reservations for each route pickup point
    const tripReservations = await this.db
      .select({
        defaultPointId: schema.users.defaultPointId,
      })
      .from(schema.reservations)
      .innerJoin(schema.users, eq(schema.reservations.userId, schema.users.id))
      .where(
        and(
          eq(schema.reservations.tripId, currentTrip.id),
          inArray(schema.reservations.status, [
            'CONFIRMED',
            'PRESENT',
            'EXCESS',
          ]),
        ),
      );

    const routePoints = await this.db
      .select()
      .from(schema.points)
      .where(eq(schema.points.routeId, currentTrip.routeId))
      .orderBy(schema.points.order);

    const pointsList = routePoints.map((p) => {
      const count = tripReservations.filter(
        (r) => r.defaultPointId === p.id,
      ).length;
      return {
        pointId: p.id,
        pointName: p.name,
        studentsCount: count,
      };
    });

    return {
      phase: currentTrip.status,
      tripId: currentTrip.id,
      points: pointsList,
    };
  }

  async departTrip(tripId: string, driverId: string) {
    const [trip] = await this.db
      .select()
      .from(schema.trips)
      .where(eq(schema.trips.id, tripId));

    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.driverId !== driverId) {
      throw new ForbiddenException(
        'You are not the driver assigned to this trip',
      );
    }

    await this.db
      .update(schema.trips)
      .set({ status: 'ONGOING' })
      .where(eq(schema.trips.id, tripId));

    return 'Trip departed successfully';
  }
}
