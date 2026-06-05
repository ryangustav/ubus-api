import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DRIZZLE } from '../../../shared/database/database.module';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../../shared/database/schema';
import { and, eq } from 'drizzle-orm';

@Injectable()
export class FleetService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  // ── Routes ───────────────────────────────────────────
  async listRoutes(municipalityId: string) {
    return this.db
      .select()
      .from(schema.routes)
      .where(
        and(
          eq(schema.routes.municipalityId, municipalityId),
          eq(schema.routes.active, true),
        ),
      );
  }

  async createRoute(
    municipalityId: string,
    dto: {
      name: string;
      description?: string;
      weekDays: number[];
      votingOpenTime: string;
      votingCloseTime: string;
    },
  ) {
    const [route] = await this.db
      .insert(schema.routes)
      .values({
        municipalityId,
        name: dto.name,
        description: dto.description ?? null,
        weekDays: dto.weekDays,
        votingOpenTime: dto.votingOpenTime,
        votingCloseTime: dto.votingCloseTime,
      })
      .returning();
    return route;
  }

  async updateRoute(
    municipalityId: string,
    id: string,
    dto: {
      name?: string;
      description?: string;
      weekDays?: number[];
      votingOpenTime?: string;
      votingCloseTime?: string;
      active?: boolean;
      requiresElevator?: boolean;
    },
  ) {
    const updates: Partial<typeof schema.routes.$inferInsert> = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.weekDays !== undefined) updates.weekDays = dto.weekDays;
    if (dto.votingOpenTime !== undefined)
      updates.votingOpenTime = dto.votingOpenTime;
    if (dto.votingCloseTime !== undefined)
      updates.votingCloseTime = dto.votingCloseTime;
    if (dto.active !== undefined) updates.active = dto.active;
    if (dto.requiresElevator !== undefined)
      updates.requiresElevator = dto.requiresElevator;

    const [route] = await this.db
      .update(schema.routes)
      .set(updates)
      .where(
        and(
          eq(schema.routes.id, id),
          eq(schema.routes.municipalityId, municipalityId),
        ),
      )
      .returning();
    if (!route) throw new NotFoundException('Route not found');
    return route;
  }

  // ── Points (pickup points) ───────────────────────────
  async listPointsByRoute(routeId: string) {
    return this.db
      .select()
      .from(schema.points)
      .where(eq(schema.points.routeId, routeId))
      .orderBy(schema.points.order);
  }

  async createPoint(
    routeId: string,
    dto: {
      name: string;
      order?: number;
      lat?: number;
      lng?: number;
      address?: string;
    },
    municipalityId: string,
  ) {
    // Verify route belongs to municipality
    const [route] = await this.db
      .select()
      .from(schema.routes)
      .where(
        and(
          eq(schema.routes.id, routeId),
          eq(schema.routes.municipalityId, municipalityId),
        ),
      );
    if (!route)
      throw new NotFoundException(
        'Route not found or belongs to another municipality',
      );

    const [point] = await this.db
      .insert(schema.points)
      .values({
        routeId,
        name: dto.name,
        order: dto.order ?? 0,
        lat: dto.lat ?? null,
        lng: dto.lng ?? null,
        address: dto.address ?? null,
      })
      .returning();
    return point;
  }

  async updatePoint(
    id: string,
    dto: {
      name?: string;
      order?: number;
      lat?: number;
      lng?: number;
      address?: string;
    },
    municipalityId: string,
  ) {
    // Verify point belongs to a route of the municipality
    const [point] = await this.db
      .select({
        point: schema.points,
        route: schema.routes,
      })
      .from(schema.points)
      .leftJoin(schema.routes, eq(schema.points.routeId, schema.routes.id))
      .where(eq(schema.points.id, id));

    if (!point?.point) throw new NotFoundException('Point not found');
    if (point.route?.municipalityId !== municipalityId) {
      throw new ForbiddenException(
        'Point belongs to a route of another municipality',
      );
    }

    const updates: Partial<typeof schema.points.$inferInsert> = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.order !== undefined) updates.order = dto.order;
    if (dto.lat !== undefined) updates.lat = dto.lat;
    if (dto.lng !== undefined) updates.lng = dto.lng;
    if (dto.address !== undefined) updates.address = dto.address;

    const [updated] = await this.db
      .update(schema.points)
      .set(updates)
      .where(eq(schema.points.id, id))
      .returning();

    return updated;
  }

  async deletePoint(id: string, municipalityId: string) {
    // Verify ownership
    const [point] = await this.db
      .select({
        point: schema.points,
        route: schema.routes,
      })
      .from(schema.points)
      .leftJoin(schema.routes, eq(schema.points.routeId, schema.routes.id))
      .where(eq(schema.points.id, id));

    if (!point?.point) throw new NotFoundException('Point not found');
    if (point.route?.municipalityId !== municipalityId) {
      throw new ForbiddenException(
        'Point belongs to a route of another municipality',
      );
    }

    await this.db.delete(schema.points).where(eq(schema.points.id, id));
    return { deleted: true };
  }

  async listPickupPoints(municipalityId: string) {
    return this.db
      .select({
        id: schema.points.id,
        name: schema.points.name,
        order: schema.points.order,
        lat: schema.points.lat,
        lng: schema.points.lng,
        address: schema.points.address,
        routeId: schema.points.routeId,
        routeName: schema.routes.name,
      })
      .from(schema.points)
      .innerJoin(schema.routes, eq(schema.points.routeId, schema.routes.id))
      .where(
        and(
          eq(schema.routes.municipalityId, municipalityId),
          eq(schema.routes.active, true),
        ),
      )
      .orderBy(schema.routes.name, schema.points.order);
  }

  // ── Buses ────────────────────────────────────────────
  async listBuses(municipalityId: string) {
    return this.db
      .select()
      .from(schema.buses)
      .where(
        and(
          eq(schema.buses.municipalityId, municipalityId),
          eq(schema.buses.active, true),
        ),
      );
  }

  async createBus(
    municipalityId: string,
    dto: {
      identificationNumber: string;
      plate: string;
      standardCapacity: number;
      hasBathroom?: boolean;
      hasAirConditioning?: boolean;
      hasElevator?: boolean;
      preferentialSeats?: number[];
    },
    driverId?: string,
  ) {
    const [bus] = await this.db
      .insert(schema.buses)
      .values({
        municipalityId,
        driverId: driverId ?? null,
        identificationNumber: dto.identificationNumber,
        plate: dto.plate,
        standardCapacity: dto.standardCapacity,
        hasBathroom: dto.hasBathroom ?? false,
        hasAirConditioning: dto.hasAirConditioning ?? false,
        hasElevator: dto.hasElevator ?? false,
        preferentialSeats: dto.preferentialSeats ?? null,
      })
      .returning();
    return bus;
  }

  async listBusesByDriver(municipalityId: string, driverId: string) {
    return this.db
      .select()
      .from(schema.buses)
      .where(
        and(
          eq(schema.buses.municipalityId, municipalityId),
          eq(schema.buses.driverId, driverId),
        ),
      );
  }

  async updateBus(
    municipalityId: string,
    id: string,
    dto: {
      identificationNumber?: string;
      plate?: string;
      standardCapacity?: number;
      hasBathroom?: boolean;
      hasAirConditioning?: boolean;
      hasElevator?: boolean;
      preferentialSeats?: number[];
      active?: boolean;
    },
  ) {
    const updates: Partial<typeof schema.buses.$inferInsert> = {};
    if (dto.identificationNumber !== undefined)
      updates.identificationNumber = dto.identificationNumber;
    if (dto.plate !== undefined) updates.plate = dto.plate;
    if (dto.standardCapacity !== undefined)
      updates.standardCapacity = dto.standardCapacity;
    if (dto.hasBathroom !== undefined) updates.hasBathroom = dto.hasBathroom;
    if (dto.hasAirConditioning !== undefined)
      updates.hasAirConditioning = dto.hasAirConditioning;
    if (dto.hasElevator !== undefined) updates.hasElevator = dto.hasElevator;
    if (dto.preferentialSeats !== undefined)
      updates.preferentialSeats = dto.preferentialSeats;
    if (dto.active !== undefined) updates.active = dto.active;

    const [bus] = await this.db
      .update(schema.buses)
      .set(updates)
      .where(
        and(
          eq(schema.buses.id, id),
          eq(schema.buses.municipalityId, municipalityId),
        ),
      )
      .returning();
    if (!bus) throw new NotFoundException('Bus not found');
    return bus;
  }

  // ── Drivers ──────────────────────────────────────────
  async listDrivers(municipalityId: string) {
    return this.db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        phone: schema.users.phone,
        profilePictureUrl: schema.users.profilePictureUrl,
        registrationStatus: schema.users.registrationStatus,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .where(
        and(
          eq(schema.users.municipalityId, municipalityId),
          eq(schema.users.role, 'DRIVER'),
        ),
      );
  }
}
