import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '../../../shared/database/database.module';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../../shared/database/schema';
import { and, eq, gte, lte, sql } from 'drizzle-orm';

@Injectable()
export class MetricsService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async getDashboard(municipalityId: string) {
    const today = new Date().toISOString().slice(0, 10);

    const [activeStudents] = await this.db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(schema.users)
      .where(
        and(
          eq(schema.users.municipalityId, municipalityId),
          eq(schema.users.role, 'STUDENT'),
          eq(schema.users.registrationStatus, 'APPROVED'),
        ),
      );

    const [tripsToday] = await this.db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(schema.trips)
      .innerJoin(
        schema.routes,
        eq(schema.trips.routeId, schema.routes.id),
      )
      .where(
        and(
          eq(schema.routes.municipalityId, municipalityId),
          eq(schema.trips.tripDate, today),
        ),
      );

    const [pendingCount] = await this.db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(schema.users)
      .where(
        and(
          eq(schema.users.municipalityId, municipalityId),
          eq(schema.users.registrationStatus, 'PENDING'),
        ),
      );

    const [fleetActive] = await this.db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(schema.buses)
      .where(
        and(
          eq(schema.buses.municipalityId, municipalityId),
          eq(schema.buses.active, true),
        ),
      );

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weeklyTrips = await this.db
      .select({
        tripDate: schema.trips.tripDate,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.trips)
      .innerJoin(schema.routes, eq(schema.trips.routeId, schema.routes.id))
      .where(
        and(
          eq(schema.routes.municipalityId, municipalityId),
          gte(schema.trips.tripDate, weekStart.toISOString().slice(0, 10)),
          lte(schema.trips.tripDate, weekEnd.toISOString().slice(0, 10)),
        ),
      )
      .groupBy(schema.trips.tripDate);

    return {
      activeStudents: activeStudents?.count ?? 0,
      tripsToday: tripsToday?.count ?? 0,
      pendingApprovals: pendingCount?.count ?? 0,
      fleetActive: fleetActive?.count ?? 0,
      weeklyTrips: weeklyTrips.map((r) => ({
        date: r.tripDate,
        count: r.count,
      })),
    };
  }
}
