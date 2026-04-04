import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import type Redis from 'ioredis';
import { DRIZZLE } from '../../../shared/database/database.module';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../../shared/database/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

const TRIP_LOCATION_PREFIX = 'trip:location:';
const TRIP_ALERT_PREFIX = 'trip:alert:';
const ALERT_TTL = 300; // 5 min

@Injectable()
export class TripsService {
  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
    @InjectRedis() private redis: Redis,
  ) {}

  async createTrip(
    dto: {
      tripId: string;
      tripDate: string;
      shift: string;
      direction: 'OUTBOUND' | 'INBOUND' | string;
      routeId: string;
      busId: string;
      driverId?: string;
      realCapacity: number;
      votingOpen: string;
      votingClose: string;
      leaderIds?: string[];
    },
    municipalityId: string,
    role?: string,
  ) {
    const [trip] = await this.db
      .insert(schema.trips)
      .values({
        id: dto.tripId,
        tripDate: dto.tripDate,
        shift: dto.shift,
        direction: dto.direction as 'OUTBOUND' | 'INBOUND',
        routeId: dto.routeId,
        busId: dto.busId,
        driverId: dto.driverId ?? null,
        actualCapacity: dto.realCapacity,
        votingOpenAt: new Date(dto.votingOpen),
        votingCloseAt: new Date(dto.votingClose),
        leaderIds: dto.leaderIds ?? [],
      })
      .returning();
    return trip;
  }

  async getTrip(tripId: string) {
    const [trip] = await this.db
      .select()
      .from(schema.trips)
      .where(eq(schema.trips.id, tripId));
    return trip;
  }

  async listOpenTrips() {
    const now = new Date();
    const rows = await this.db
      .select({
        trip: schema.trips,
        route: schema.routes,
        bus: schema.buses,
      })
      .from(schema.trips)
      .leftJoin(schema.routes, eq(schema.trips.routeId, schema.routes.id))
      .leftJoin(schema.buses, eq(schema.trips.busId, schema.buses.id))
      .where(
        and(
          eq(schema.trips.status, 'OPEN_FOR_RESERVATION'),
          lte(schema.trips.votingOpenAt, now),
          gte(schema.trips.votingCloseAt, now),
        ),
      );

    return rows.map((r) => ({
      ...r.trip,
      route: r.route,
      bus: r.bus,
    }));
  }

  async updateTrip(
    tripId: string,
    dto: Partial<{
      tripDate: string;
      shift: string;
      direction: 'OUTBOUND' | 'INBOUND' | string;
      routeId: string;
      busId: string;
      driverId: string | null;
      realCapacity: number;
      votingOpen: string;
      votingClose: string;
      leaderIds: string[];
      status: string;
    }>,
    municipalityId: string,
    role?: string,
  ) {
    const updates: Record<string, unknown> = {};
    if (dto.tripDate !== undefined) updates.tripDate = dto.tripDate;
    if (dto.shift !== undefined) updates.shift = dto.shift;
    if (dto.direction !== undefined) updates.direction = dto.direction;
    if (dto.routeId !== undefined) updates.routeId = dto.routeId;
    if (dto.busId !== undefined) updates.busId = dto.busId;
    if (dto.driverId !== undefined) updates.driverId = dto.driverId;
    if (dto.realCapacity !== undefined)
      updates.actualCapacity = dto.realCapacity;
    if (dto.votingOpen !== undefined)
      updates.votingOpenAt = new Date(dto.votingOpen);
    if (dto.votingClose !== undefined)
      updates.votingCloseAt = new Date(dto.votingClose);
    if (dto.leaderIds !== undefined) updates.leaderIds = dto.leaderIds;
    if (dto.status !== undefined) updates.status = dto.status;

    const [trip] = await this.db
      .update(schema.trips)
      .set(updates as Record<string, never>)
      .where(eq(schema.trips.id, tripId))
      .returning();
    if (!trip) throw new NotFoundException('Trip not found');
    return trip;
  }

  async triggerConfirmationAlert(
    tripId: string,
    userId: string,
    municipalityId: string,
    role?: string,
  ) {
    const [trip] = await this.db
      .select()
      .from(schema.trips)
      .where(eq(schema.trips.id, tripId));
    if (!trip) throw new NotFoundException('Trip not found');

    const isLeader =
      Array.isArray(trip.leaderIds) && trip.leaderIds.includes(userId);
    const [driver] = trip.driverId
      ? await this.db
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, trip.driverId))
      : [null];
    const isDriver = driver?.id === userId;

    const [route] = await this.db
      .select()
      .from(schema.routes)
      .where(eq(schema.routes.id, trip.routeId));
    if (route?.municipalityId !== municipalityId && role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Trip belongs to another municipality');
    }
    if (!isLeader && !isDriver && role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only leader or driver can trigger alert');
    }

    const key = `${TRIP_ALERT_PREFIX}${tripId}`;
    await this.redis.setex(key, ALERT_TTL, Date.now().toString());

    return { message: 'Confirmation alert triggered', expiresIn: ALERT_TTL };
  }

  async finishAndPunish(
    tripId: string,
    userId: string,
    municipalityId: string,
    role?: string,
  ) {
    const [trip] = await this.db
      .select()
      .from(schema.trips)
      .where(eq(schema.trips.id, tripId));
    if (!trip) throw new NotFoundException('Trip not found');

    const isLeader =
      Array.isArray(trip.leaderIds) && trip.leaderIds.includes(userId);
    const [route] = await this.db
      .select()
      .from(schema.routes)
      .where(eq(schema.routes.id, trip.routeId));
    if (route?.municipalityId !== municipalityId && role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Trip belongs to another municipality');
    }
    if (!isLeader && role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only leader can confirm absences');
    }

    const reservations = await this.db
      .select()
      .from(schema.reservations)
      .where(eq(schema.reservations.tripId, tripId));

    for (const r of reservations) {
      if (r.status === 'CONFIRMED') {
        await this.db
          .update(schema.reservations)
          .set({ status: 'ABSENT' })
          .where(eq(schema.reservations.id, r.id));

        const [user] = await this.db
          .select({ priorityLevel: schema.users.priorityLevel })
          .from(schema.users)
          .where(eq(schema.users.id, r.userId));
        const newLevel = Math.min(3, (user?.priorityLevel ?? 1) + 1);
        const blockUntil = new Date();
        blockUntil.setDate(blockUntil.getDate() + 7);

        await this.db
          .update(schema.users)
          .set({
            priorityLevel: newLevel,
            seatBlockUntil: blockUntil,
          })
          .where(eq(schema.users.id, r.userId));
      }
    }

    await this.db
      .update(schema.trips)
      .set({ status: 'FINISHED' })
      .where(eq(schema.trips.id, tripId));

    return { message: 'Absences confirmed and penalties applied' };
  }

  async relocation(
    tripId: string,
    destinationTripId: string,
    userId: string,
    municipalityId: string,
    role?: string,
  ) {
    const [originTrip] = await this.db
      .select()
      .from(schema.trips)
      .where(eq(schema.trips.id, tripId));
    if (!originTrip) throw new NotFoundException('Origin trip not found');

    const [destinationTrip] = await this.db
      .select()
      .from(schema.trips)
      .where(eq(schema.trips.id, destinationTripId));
    if (!destinationTrip) throw new NotFoundException('Destination trip not found');

    const isLeader =
      Array.isArray(originTrip.leaderIds) &&
      originTrip.leaderIds.includes(userId);
    const [route] = await this.db
      .select()
      .from(schema.routes)
      .where(eq(schema.routes.id, originTrip.routeId));
    if (route?.municipalityId !== municipalityId && role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Trip belongs to another municipality');
    }
    if (!isLeader && role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only leader can relocate');
    }

    const reservations = await this.db
      .select()
      .from(schema.reservations)
      .where(eq(schema.reservations.tripId, tripId));

    const occupiedDestination = await this.db
      .select({ seatNumber: schema.reservations.seatNumber })
      .from(schema.reservations)
      .where(eq(schema.reservations.tripId, destinationTripId));

    const occupiedSet = new Set(
      occupiedDestination.map((o) => o.seatNumber).filter((n): n is number => n != null),
    );

    let seat = 1;
    for (const r of reservations) {
      let newSeat: number | null = r.seatNumber;
      if (r.seatNumber != null) {
        while (occupiedSet.has(seat)) seat++;
        newSeat = seat;
        occupiedSet.add(seat);
      }

      await this.db
        .update(schema.reservations)
        .set({
          tripId: destinationTripId,
          seatNumber: newSeat,
        })
        .where(eq(schema.reservations.id, r.id));
    }

    await this.db
      .update(schema.trips)
      .set({ status: 'CANCELLED' })
      .where(eq(schema.trips.id, tripId));

    return { message: 'Relocation completed' };
  }

  async updateLocation(
    tripId: string,
    lat: number,
    lng: number,
    userId: string,
    municipalityId: string,
    role?: string,
  ) {
    const [trip] = await this.db
      .select()
      .from(schema.trips)
      .where(eq(schema.trips.id, tripId));
    if (!trip) throw new NotFoundException('Trip not found');

    const isDriver = trip.driverId === userId;
    const isLeader =
      Array.isArray(trip.leaderIds) && trip.leaderIds.includes(userId);
    const [route] = await this.db
      .select()
      .from(schema.routes)
      .where(eq(schema.routes.id, trip.routeId));
    if (route?.municipalityId !== municipalityId && role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Trip belongs to another municipality');
    }
    if (!isDriver && !isLeader && role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only driver or leader can update location');
    }

    const key = `${TRIP_LOCATION_PREFIX}${tripId}`;
    const payload = JSON.stringify({
      lat,
      lng,
      at: new Date().toISOString(),
    });
    await this.redis.setex(key, 3600, payload);

    return { message: 'Location updated' };
  }

  async getLocation(tripId: string) {
    const key = `${TRIP_LOCATION_PREFIX}${tripId}`;
    const raw = await this.redis.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as { lat: number; lng: number; at: string };
    } catch {
      return null;
    }
  }

  async getAlertStatus(tripId: string) {
    const key = `${TRIP_ALERT_PREFIX}${tripId}`;
    const ttl = await this.redis.ttl(key);
    if (ttl <= 0) return { active: false };
    return { active: true, expiresIn: ttl };
  }
}
