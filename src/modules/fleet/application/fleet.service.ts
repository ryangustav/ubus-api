import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '../../../shared/database/database.module';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../../shared/database/schema';
import { and, eq } from 'drizzle-orm';

@Injectable()
export class FleetService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

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

  async listPointsByRoute(routeId: string) {
    return this.db
      .select()
      .from(schema.points)
      .where(eq(schema.points.routeId, routeId))
      .orderBy(schema.points.order);
  }

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

  async createBus(
    municipalityId: string,
    dto: {
      identificationNumber: string;
      plate: string;
      standardCapacity: number;
      hasBathroom?: boolean;
      hasAirConditioning?: boolean;
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
}
