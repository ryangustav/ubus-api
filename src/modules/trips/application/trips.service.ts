import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import type Redis from 'ioredis';
import { DRIZZLE } from '../../../shared/database/database.module';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../../shared/database/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { ScheduleTripsDto } from '../dto/schedule-trips.dto';

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
      direction: 'OUTBOUND' | 'INBOUND';
      routeId: string;
      busId: string;
      driverId?: string;
      realCapacity: number;
      votingOpen: string;
      votingClose: string;
      leaderIds?: string[];
    },
    municipalityId?: string,
    role?: string,
  ) {
    if (role !== 'SUPER_ADMIN' && municipalityId) {
      const [route] = await this.db
        .select({ municipalityId: schema.routes.municipalityId })
        .from(schema.routes)
        .where(eq(schema.routes.id, dto.routeId));
      if (!route) throw new NotFoundException('Route not found');
      if (route.municipalityId !== municipalityId) {
        throw new ForbiddenException('Route belongs to another municipality');
      }

      const [bus] = await this.db
        .select({ municipalityId: schema.buses.municipalityId })
        .from(schema.buses)
        .where(eq(schema.buses.id, dto.busId));
      if (!bus) throw new NotFoundException('Bus not found');
      if (bus.municipalityId !== municipalityId) {
        throw new ForbiddenException('Bus belongs to another municipality');
      }
    }

    const [route] = await this.db
      .select({ requiresElevator: schema.routes.requiresElevator })
      .from(schema.routes)
      .where(eq(schema.routes.id, dto.routeId));

    const [bus] = await this.db
      .select({ hasElevator: schema.buses.hasElevator })
      .from(schema.buses)
      .where(eq(schema.buses.id, dto.busId));

    const [trip] = await this.db
      .insert(schema.trips)
      .values({
        id: dto.tripId,
        tripDate: dto.tripDate,
        shift: dto.shift,
        direction: dto.direction,
        routeId: dto.routeId,
        busId: dto.busId,
        driverId: dto.driverId ?? null,
        actualCapacity: dto.realCapacity,
        votingOpenAt: new Date(dto.votingOpen),
        votingCloseAt: new Date(dto.votingClose),
        leaderIds: dto.leaderIds ?? [],
        status: 'OPEN_FOR_RESERVATION',
      })
      .returning();

    const hasWarning = route?.requiresElevator && (!bus || !bus.hasElevator);
    return {
      ...trip,
      warning: hasWarning ? 'BUS_NO_ELEVATOR' : undefined,
    };
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

    // Group trips by route + date + bus so OUTBOUND and INBOUND
    // appear as a single entry with available directions
    const groupMap = new Map<
      string,
      {
        route: (typeof rows)[0]['route'];
        bus: (typeof rows)[0]['bus'];
        tripDate: string;
        shift: string;
        routeId: string;
        busId: string;
        votingOpenAt: Date;
        votingCloseAt: Date;
        actualCapacity: number;
        availableDirections: {
          direction: string;
          tripId: string;
        }[];
      }
    >();

    for (const r of rows) {
      const key = `${r.trip.routeId}|${r.trip.tripDate}|${r.trip.busId}`;
      let group = groupMap.get(key);
      if (!group) {
        group = {
          route: r.route,
          bus: r.bus,
          tripDate: r.trip.tripDate,
          shift: r.trip.shift,
          routeId: r.trip.routeId,
          busId: r.trip.busId,
          votingOpenAt: r.trip.votingOpenAt,
          votingCloseAt: r.trip.votingCloseAt,
          actualCapacity: r.trip.actualCapacity,
          availableDirections: [],
        };
        groupMap.set(key, group);
      }
      group.availableDirections.push({
        direction: r.trip.direction,
        tripId: r.trip.id,
      });
    }

    return Array.from(groupMap.values());
  }

  async updateTrip(
    tripId: string,
    dto: Partial<{
      tripDate: string;
      shift: string;
      direction: 'OUTBOUND' | 'INBOUND';
      routeId: string;
      busId: string;
      driverId: string | null;
      realCapacity: number;
      votingOpen: string;
      votingClose: string;
      leaderIds: string[];
      status: string;
    }>,
    municipalityId?: string,
    role?: string,
  ) {
    const [existingTrip] = await this.db
      .select()
      .from(schema.trips)
      .where(eq(schema.trips.id, tripId));
    if (!existingTrip) throw new NotFoundException('Trip not found');

    if (role !== 'SUPER_ADMIN' && municipalityId) {
      // Validate existing trip's route municipality
      const [existingRoute] = await this.db
        .select({ municipalityId: schema.routes.municipalityId })
        .from(schema.routes)
        .where(eq(schema.routes.id, existingTrip.routeId));
      if (!existingRoute || existingRoute.municipalityId !== municipalityId) {
        throw new ForbiddenException('Trip belongs to another municipality');
      }

      // If updating routeId, check new route
      if (dto.routeId) {
        const [newRoute] = await this.db
          .select({ municipalityId: schema.routes.municipalityId })
          .from(schema.routes)
          .where(eq(schema.routes.id, dto.routeId));
        if (!newRoute) throw new NotFoundException('Route not found');
        if (newRoute.municipalityId !== municipalityId) {
          throw new ForbiddenException('Route belongs to another municipality');
        }
      }

      // If updating busId, check new bus
      if (dto.busId) {
        const [newBus] = await this.db
          .select({ municipalityId: schema.buses.municipalityId })
          .from(schema.buses)
          .where(eq(schema.buses.id, dto.busId));
        if (!newBus) throw new NotFoundException('Bus not found');
        if (newBus.municipalityId !== municipalityId) {
          throw new ForbiddenException('Bus belongs to another municipality');
        }
      }
    }
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

    const [route] = await this.db
      .select({ requiresElevator: schema.routes.requiresElevator })
      .from(schema.routes)
      .where(eq(schema.routes.id, trip.routeId));

    const [bus] = await this.db
      .select({ hasElevator: schema.buses.hasElevator })
      .from(schema.buses)
      .where(eq(schema.buses.id, trip.busId));

    const hasWarning = route?.requiresElevator && (!bus || !bus.hasElevator);

    return {
      ...trip,
      warning: hasWarning ? 'BUS_NO_ELEVATOR' : undefined,
    };
  }

  async scheduleTrips(dto: ScheduleTripsDto, municipalityId: string) {
    // 1. Fetch route
    const [route] = await this.db
      .select()
      .from(schema.routes)
      .where(
        and(
          eq(schema.routes.id, dto.routeId),
          eq(schema.routes.municipalityId, municipalityId),
        ),
      );
    if (!route) throw new NotFoundException('Route not found');

    // 2. Fetch bus
    const [bus] = await this.db
      .select()
      .from(schema.buses)
      .where(
        and(
          eq(schema.buses.id, dto.busId),
          eq(schema.buses.municipalityId, municipalityId),
        ),
      );
    if (!bus) throw new NotFoundException('Bus not found');

    let targetDates: string[] = [];
    if (dto.dates && dto.dates.length > 0) {
      targetDates = dto.dates;
    } else if (dto.startDate && dto.endDate) {
      const start = new Date(dto.startDate + 'T00:00:00Z');
      const end = new Date(dto.endDate + 'T00:00:00Z');
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getUTCDay();
        if (route.weekDays.includes(dayOfWeek)) {
          const year = d.getUTCFullYear();
          const month = String(d.getUTCMonth() + 1).padStart(2, '0');
          const day = String(d.getUTCDate()).padStart(2, '0');
          targetDates.push(`${year}-${month}-${day}`);
        }
      }
    } else {
      throw new BadRequestException(
        'Either startDate and endDate, or dates must be provided',
      );
    }

    let shiftVal = dto.shift;
    if (route.departureTimeOutbound) {
      const hour = parseInt(route.departureTimeOutbound.split(':')[0], 10);
      if (!isNaN(hour)) {
        if (hour >= 0 && hour < 12) {
          shiftVal = 'MORNING';
        } else if (hour >= 12 && hour < 18) {
          shiftVal = 'AFTERNOON';
        } else {
          shiftVal = 'NIGHT';
        }
      }
    }

    const shiftChar = shiftVal.toUpperCase().startsWith('M')
      ? 'M'
      : shiftVal.toUpperCase().startsWith('A') ||
          shiftVal.toUpperCase().startsWith('T')
        ? 'T'
        : 'N';

    const created: any[] = [];
    const warnings: any[] = [];
    const directions: ('OUTBOUND' | 'INBOUND')[] = ['OUTBOUND', 'INBOUND'];

    for (const dateStr of targetDates) {
      const parts = dateStr.split('-');
      if (parts.length !== 3) continue;
      const year = parts[0];
      const month = parts[1];
      const day = parts[2];
      const smartDate = `${year}${month}${day}`;

      for (const direction of directions) {
        const suffix = direction === 'OUTBOUND' ? 'O' : 'I';
        const tripId = `${smartDate}-${bus.identificationNumber}-${shiftChar}-${suffix}`;

        const votingOpenAt = new Date(
          `${dateStr}T${route.votingOpenTime}:00.000Z`,
        );
        const votingCloseAt = new Date(
          `${dateStr}T${route.votingCloseTime}:00.000Z`,
        );

        if (route.votingOpenTime > route.votingCloseTime) {
          votingOpenAt.setUTCDate(votingOpenAt.getUTCDate() - 1);
        }

        // Check if trip already exists
        const [existing] = await this.db
          .select()
          .from(schema.trips)
          .where(eq(schema.trips.id, tripId));

        if (!existing) {
          const [trip] = await this.db
            .insert(schema.trips)
            .values({
              id: tripId,
              tripDate: dateStr,
              shift: shiftVal,
              direction: direction,
              routeId: dto.routeId,
              busId: dto.busId,
              driverId: dto.driverId ?? null,
              actualCapacity: dto.realCapacity,
              votingOpenAt,
              votingCloseAt,
              status: 'OPEN_FOR_RESERVATION',
            })
            .returning();

          created.push(trip);

          if (route.requiresElevator && !bus.hasElevator) {
            warnings.push({ tripId, warning: 'BUS_NO_ELEVATOR' });
          }
        } else {
          // Trip already exists — update it to OPEN_FOR_RESERVATION
          const [updated] = await this.db
            .update(schema.trips)
            .set({
              tripDate: dateStr,
              shift: shiftVal,
              direction: direction,
              routeId: dto.routeId,
              busId: dto.busId,
              driverId: dto.driverId ?? null,
              actualCapacity: dto.realCapacity,
              votingOpenAt,
              votingCloseAt,
              status: 'OPEN_FOR_RESERVATION',
            })
            .where(eq(schema.trips.id, tripId))
            .returning();

          created.push(updated);

          if (route.requiresElevator && !bus.hasElevator) {
            warnings.push({ tripId, warning: 'BUS_NO_ELEVATOR' });
          }
        }
      }
    }

    return { scheduledCount: created.length, trips: created, warnings };
  }

  async assignDriverToTrip(
    tripId: string,
    driverId: string | null,
    municipalityId: string,
    role: string,
  ) {
    const [trip] = await this.db
      .select()
      .from(schema.trips)
      .where(eq(schema.trips.id, tripId));

    if (!trip) throw new NotFoundException('Trip not found');

    const [route] = await this.db
      .select()
      .from(schema.routes)
      .where(eq(schema.routes.id, trip.routeId));

    if (route?.municipalityId !== municipalityId && role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Trip belongs to another municipality');
    }

    if (driverId) {
      const [driver] = await this.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, driverId));

      if (!driver) throw new NotFoundException('Driver not found');
      if (driver.role !== 'DRIVER') {
        throw new ForbiddenException('User is not a driver');
      }
      if (driver.municipalityId !== municipalityId && role !== 'SUPER_ADMIN') {
        throw new ForbiddenException('Driver belongs to another municipality');
      }
    }

    const [updated] = await this.db
      .update(schema.trips)
      .set({ driverId: driverId })
      .where(eq(schema.trips.id, tripId))
      .returning();

    return updated;
  }

  async getRouteCalendar(routeId: string, year?: number, month?: number) {
    const y = year ?? new Date().getUTCFullYear();
    const m = month ?? new Date().getUTCMonth() + 1;

    const startStr = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const endStr = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    return this.db
      .select()
      .from(schema.trips)
      .where(
        and(
          eq(schema.trips.routeId, routeId),
          gte(schema.trips.tripDate, startStr),
          lte(schema.trips.tripDate, endStr),
        ),
      );
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
    if (!destinationTrip)
      throw new NotFoundException('Destination trip not found');

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
      occupiedDestination
        .map((o) => o.seatNumber)
        .filter((n): n is number => n != null),
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
