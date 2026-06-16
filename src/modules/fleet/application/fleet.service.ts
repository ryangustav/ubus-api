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
import { and, eq, gte, inArray } from 'drizzle-orm';

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
      departureTimeOutbound?: string;
      departureTimeInbound?: string;
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
        departureTimeOutbound: dto.departureTimeOutbound ?? null,
        departureTimeInbound: dto.departureTimeInbound ?? null,
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
      departureTimeOutbound?: string;
      departureTimeInbound?: string;
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
    if (dto.departureTimeOutbound !== undefined)
      updates.departureTimeOutbound = dto.departureTimeOutbound;
    if (dto.departureTimeInbound !== undefined)
      updates.departureTimeInbound = dto.departureTimeInbound;

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

  async deleteRoute(id: string, municipalityId: string, role: string) {
    // 1. Fetch route
    const [route] = await this.db
      .select()
      .from(schema.routes)
      .where(eq(schema.routes.id, id));

    if (!route) {
      throw new NotFoundException('Rota não encontrada.');
    }

    // Tenant check
    if (role !== 'SUPER_ADMIN' && route.municipalityId !== municipalityId) {
      throw new ForbiddenException('Route belongs to another municipality');
    }

    // 2. Business Rule 1: check if active
    if (route.active) {
      throw new BadRequestException(
        'Não é possível excluir uma rota ativa. Desative-a antes de excluir.',
      );
    }

    // 3. Business Rule 2: check if there are future trips (today onwards)
    const todayStr = new Date().toISOString().slice(0, 10);
    const futureTrips = await this.db
      .select({ id: schema.trips.id })
      .from(schema.trips)
      .where(
        and(
          eq(schema.trips.routeId, id),
          gte(schema.trips.tripDate, todayStr),
        ),
      );

    if (futureTrips.length > 0) {
      throw new ConflictException(
        'Não é possível excluir a rota pois existem viagens futuras planejadas.',
      );
    }

    // 4. Disassociate route and route points from users
    await this.db
      .update(schema.users)
      .set({ defaultRouteId: null })
      .where(eq(schema.users.defaultRouteId, id));

    // Get point IDs to disassociate defaultPointId from users
    const routePoints = await this.db
      .select({ id: schema.points.id })
      .from(schema.points)
      .where(eq(schema.points.routeId, id));

    const pointIds = routePoints.map((p) => p.id);
    if (pointIds.length > 0) {
      await this.db
        .update(schema.users)
        .set({ defaultPointId: null })
        .where(inArray(schema.users.defaultPointId, pointIds));
    }

    // 5. Delete past trips (which will delete past reservations in cascade)
    await this.db
      .delete(schema.trips)
      .where(eq(schema.trips.routeId, id));

    // 6. Delete route (will delete points and dropoffPoints in cascade)
    await this.db
      .delete(schema.routes)
      .where(eq(schema.routes.id, id));
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

  // ── Dropoff Points ───────────────────────────────────
  async listDropoffPointsByRoute(routeId: string) {
    return this.db
      .select()
      .from(schema.dropoffPoints)
      .where(eq(schema.dropoffPoints.routeId, routeId));
  }

  async createDropoffPoint(
    routeId: string,
    dto: {
      name: string;
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
      .insert(schema.dropoffPoints)
      .values({
        routeId,
        name: dto.name,
        lat: dto.lat ?? null,
        lng: dto.lng ?? null,
        address: dto.address ?? null,
      })
      .returning();
    return point;
  }

  async updateDropoffPoint(
    id: string,
    dto: {
      name?: string;
      lat?: number;
      lng?: number;
      address?: string;
    },
    municipalityId: string,
  ) {
    // Verify dropoff point belongs to a route of the municipality
    const [point] = await this.db
      .select({
        point: schema.dropoffPoints,
        route: schema.routes,
      })
      .from(schema.dropoffPoints)
      .leftJoin(schema.routes, eq(schema.dropoffPoints.routeId, schema.routes.id))
      .where(eq(schema.dropoffPoints.id, id));

    if (!point?.point) throw new NotFoundException('Dropoff point not found');
    if (point.route?.municipalityId !== municipalityId) {
      throw new ForbiddenException(
        'Dropoff point belongs to a route of another municipality',
      );
    }

    const updates: Partial<typeof schema.dropoffPoints.$inferInsert> = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.lat !== undefined) updates.lat = dto.lat;
    if (dto.lng !== undefined) updates.lng = dto.lng;
    if (dto.address !== undefined) updates.address = dto.address;

    const [updated] = await this.db
      .update(schema.dropoffPoints)
      .set(updates)
      .where(eq(schema.dropoffPoints.id, id))
      .returning();

    return updated;
  }

  async deleteDropoffPoint(id: string, municipalityId: string) {
    // Verify ownership
    const [point] = await this.db
      .select({
        point: schema.dropoffPoints,
        route: schema.routes,
      })
      .from(schema.dropoffPoints)
      .leftJoin(schema.routes, eq(schema.dropoffPoints.routeId, schema.routes.id))
      .where(eq(schema.dropoffPoints.id, id));

    if (!point?.point) throw new NotFoundException('Dropoff point not found');
    if (point.route?.municipalityId !== municipalityId) {
      throw new ForbiddenException(
        'Dropoff point belongs to a route of another municipality',
      );
    }

    await this.db.delete(schema.dropoffPoints).where(eq(schema.dropoffPoints.id, id));
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
    const buses = await this.db
      .select()
      .from(schema.buses)
      .where(
        and(
          eq(schema.buses.municipalityId, municipalityId),
          eq(schema.buses.active, true),
        ),
      );
    return buses.map(bus => ({ ...bus, routeId: null }));
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
      seatLayout?: any;
    },
    driverId?: string,
  ) {
    let prefSeats = dto.preferentialSeats ?? null;
    if (dto.seatLayout && dto.seatLayout.preferentialSeats) {
      prefSeats = dto.seatLayout.preferentialSeats;
    }

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
        preferentialSeats: prefSeats,
      })
      .returning();

    if (dto.seatLayout) {
      const sanitizedRows = this.validateAndSanitizeLayout(bus, dto.seatLayout);
      await this.db
        .insert(schema.busLayouts)
        .values({
          busId: bus.id,
          numberingMode: dto.seatLayout.numberingMode,
          numerationSide: dto.seatLayout.numerationSide,
          dpmSeatVirtualNumber: dto.seatLayout.dpmSeatVirtualNumber ?? null,
          preferentialSeats: dto.seatLayout.preferentialSeats || [],
          rows: sanitizedRows,
        });
    }

    return {
      ...bus,
      routeId: null,
    };
  }

  async listBusesByDriver(municipalityId: string, driverId: string) {
    const buses = await this.db
      .select()
      .from(schema.buses)
      .where(
        and(
          eq(schema.buses.municipalityId, municipalityId),
          eq(schema.buses.driverId, driverId),
        ),
      );
    return buses.map(bus => ({ ...bus, routeId: null }));
  }

  async findOneBus(municipalityId: string, id: string, role?: string) {
    const conditions = [eq(schema.buses.id, id)];
    if (role !== 'SUPER_ADMIN') {
      conditions.push(eq(schema.buses.municipalityId, municipalityId));
    }
    const [bus] = await this.db
      .select()
      .from(schema.buses)
      .where(and(...conditions));
    if (!bus) throw new NotFoundException('Ônibus não encontrado');
    return {
      ...bus,
      routeId: null,
    };
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
    if (dto.preferentialSeats !== undefined) {
      updates.preferentialSeats = dto.preferentialSeats;
      // Also update layout's preferentialSeats if it exists
      await this.db
        .update(schema.busLayouts)
        .set({ preferentialSeats: dto.preferentialSeats })
        .where(eq(schema.busLayouts.busId, id));
    }
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
    if (!bus) throw new NotFoundException('Ônibus não encontrado');
    return {
      ...bus,
      routeId: null,
    };
  }

  private validateAndSanitizeLayout(
    bus: { standardCapacity: number },
    dto: {
      numberingMode: string;
      numerationSide: string;
      dpmSeatVirtualNumber?: number | null;
      preferentialSeats: number[];
      rows: Array<{ cells: Array<{ col: number; type: string; virtualNumber?: number | null; physicalNumber?: number | null; position?: string | null; isDpm: boolean }> }>;
    }
  ) {
    if (!dto.rows || dto.rows.length === 0) {
      throw new BadRequestException('rows vazio');
    }

    const allCells = dto.rows.flatMap(r => r.cells);
    const seats = allCells.filter(c => c.type === 'SEAT');

    for (const cell of allCells) {
      if (cell.col < 1 || cell.col > 5) {
        throw new BadRequestException('col fora de 1–5');
      }
      const validTypes = ['SEAT', 'AISLE', 'EMPTY', 'BATHROOM', 'BOX'];
      if (!validTypes.includes(cell.type)) {
        throw new BadRequestException('type inválido');
      }
    }

    for (let rIdx = 0; rIdx < dto.rows.length; rIdx++) {
      const row = dto.rows[rIdx];
      if (!row.cells || row.cells.length !== 5) {
        throw new BadRequestException('5 células por linha');
      }
      const cols = row.cells.map(c => c.col).sort((a, b) => a - b);
      if (cols[0] !== 1 || cols[1] !== 2 || cols[2] !== 3 || cols[3] !== 4 || cols[4] !== 5) {
        throw new BadRequestException('cada row.cells deve ter exatamente as colunas 1, 2, 3, 4, 5 em ordem');
      }
    }

    if (seats.length !== bus.standardCapacity) {
      throw new BadRequestException(`contagem de SEATs (${seats.length}) ≠ standardCapacity (${bus.standardCapacity}) do ônibus`);
    }

    const virtualNumbers = seats.map(s => s.virtualNumber);
    const uniqueNumbers = new Set(virtualNumbers);
    if (uniqueNumbers.size !== virtualNumbers.length) {
      throw new BadRequestException('virtualNumber duplicado');
    }

    for (let i = 1; i <= bus.standardCapacity; i++) {
      if (!uniqueNumbers.has(i)) {
        throw new BadRequestException(`virtualNumber sequencial: devem ser inteiros de 1 a ${bus.standardCapacity}, sem lacunas`);
      }
    }

    if (dto.dpmSeatVirtualNumber !== null && dto.dpmSeatVirtualNumber !== undefined) {
      const dpmCell = seats.find(
        s => s.virtualNumber === dto.dpmSeatVirtualNumber && s.isDpm === true
      );
      if (!dpmCell) {
        throw new BadRequestException(
          'se dpmSeatVirtualNumber não for null, deve existir exatamente uma célula com virtualNumber == dpmSeatVirtualNumber e isDpm == true'
        );
      }
      const dpmCount = allCells.filter(c => c.isDpm === true).length;
      if (dpmCount !== 1) {
        throw new BadRequestException('deve existir exatamente uma célula com isDpm == true');
      }
    } else {
      const dpmCount = allCells.filter(c => c.isDpm === true).length;
      if (dpmCount > 0) {
        throw new BadRequestException('dpmSeatVirtualNumber é null, mas há células com isDpm = true');
      }
    }

    for (const seatNum of dto.preferentialSeats || []) {
      if (!uniqueNumbers.has(seatNum)) {
        throw new BadRequestException('todos os valores de preferentialSeats devem existir como virtualNumber em células type=SEAT');
      }
    }

    const sanitizedRows = dto.rows.map(row => {
      return {
        cells: row.cells.map(cell => {
          const type = cell.type;
          const isSeat = type === 'SEAT';

          const virtualNumber = isSeat ? cell.virtualNumber : null;
          const physicalNumber = (isSeat && dto.numberingMode !== 'VIRTUAL') ? cell.physicalNumber : null;
          const position = isSeat ? cell.position : null;
          const isDpm = isSeat ? cell.isDpm : false;

          return {
            col: cell.col,
            type,
            virtualNumber,
            physicalNumber,
            position,
            isDpm,
          };
        })
      };
    });

    return sanitizedRows;
  }

  async updateBusLayout(
    busId: string,
    user: { sub: string; role: string; municipalityId: string },
    dto: {
      numberingMode: string;
      numerationSide: string;
      dpmSeatVirtualNumber?: number | null;
      preferentialSeats: number[];
      rows: Array<{ cells: Array<{ col: number; type: string; virtualNumber?: number | null; physicalNumber?: number | null; position?: string | null; isDpm: boolean }> }>;
    },
  ) {
    const conditions = [eq(schema.buses.id, busId)];
    if (user.role !== 'SUPER_ADMIN') {
      conditions.push(eq(schema.buses.municipalityId, user.municipalityId));
    }
    const [bus] = await this.db
      .select()
      .from(schema.buses)
      .where(and(...conditions));
    if (!bus) {
      throw new NotFoundException('Ônibus não encontrado');
    }

    if (user.role === 'DRIVER') {
      if (bus.driverId !== user.sub) {
        throw new ForbiddenException('Motorista só pode alterar o layout do próprio ônibus');
      }
    } else if (user.role === 'MANAGER') {
      if (bus.municipalityId !== user.municipalityId) {
        throw new ForbiddenException('Gestor só pode alterar ônibus de seu município');
      }
    } else if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Acesso negado');
    }

    const sanitizedRows = this.validateAndSanitizeLayout(bus, dto);

    await this.db
      .update(schema.buses)
      .set({ preferentialSeats: dto.preferentialSeats || [] })
      .where(eq(schema.buses.id, busId));

    await this.db
      .insert(schema.busLayouts)
      .values({
        busId,
        numberingMode: dto.numberingMode,
        numerationSide: dto.numerationSide,
        dpmSeatVirtualNumber: dto.dpmSeatVirtualNumber ?? null,
        preferentialSeats: dto.preferentialSeats || [],
        rows: sanitizedRows,
      })
      .onConflictDoUpdate({
        target: schema.busLayouts.busId,
        set: {
          numberingMode: dto.numberingMode,
          numerationSide: dto.numerationSide,
          dpmSeatVirtualNumber: dto.dpmSeatVirtualNumber ?? null,
          preferentialSeats: dto.preferentialSeats || [],
          rows: sanitizedRows,
          updatedAt: new Date(),
        },
      });

    const [layout] = await this.db
      .select()
      .from(schema.busLayouts)
      .where(eq(schema.busLayouts.busId, busId));

    return {
      busId: layout.busId,
      numberingMode: layout.numberingMode,
      numerationSide: layout.numerationSide,
      dpmSeatVirtualNumber: layout.dpmSeatVirtualNumber,
      preferentialSeats: layout.preferentialSeats || [],
      updatedAt: layout.updatedAt,
      rows: layout.rows,
    };
  }

  async getBusLayout(busId: string, municipalityId: string, role: string) {
    const conditions = [eq(schema.buses.id, busId)];
    if (role !== 'SUPER_ADMIN') {
      conditions.push(eq(schema.buses.municipalityId, municipalityId));
    }
    const [bus] = await this.db
      .select()
      .from(schema.buses)
      .where(and(...conditions));
    if (!bus) {
      throw new NotFoundException('Ônibus não encontrado');
    }

    const [layout] = await this.db
      .select()
      .from(schema.busLayouts)
      .where(eq(schema.busLayouts.busId, busId));

    if (!layout) {
      throw new NotFoundException('Layout não cadastrado');
    }

    return {
      busId: layout.busId,
      numberingMode: layout.numberingMode,
      numerationSide: layout.numerationSide,
      dpmSeatVirtualNumber: layout.dpmSeatVirtualNumber,
      preferentialSeats: layout.preferentialSeats || [],
      updatedAt: layout.updatedAt,
      rows: layout.rows,
    };
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
