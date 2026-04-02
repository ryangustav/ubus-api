import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq } from 'drizzle-orm';

/**
 * Allows: MANAGER, DRIVER or leader of some trip that uses this bus.
 */
@Injectable()
export class BusLeaderGuard implements CanActivate {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      user?: { sub?: string; role?: string; municipalityId?: string };
      params?: { id?: string };
    }>();
    const user = req.user;
    if (!user?.sub || !user?.municipalityId) return false;

    if (user.role === 'MANAGER' || user.role === 'DRIVER') return true;

    const busId = req.params?.id;
    if (!busId) return false;

    const [bus] = await this.db
      .select()
      .from(schema.buses)
      .where(eq(schema.buses.id, busId));

    if (!bus || bus.municipalityId !== user.municipalityId) return false;

    const trips = await this.db
      .select({ leaderIds: schema.trips.leaderIds })
      .from(schema.trips)
      .where(eq(schema.trips.busId, busId));

    const userId = user.sub;
    return trips.some(
      (v) => Array.isArray(v.leaderIds) && v.leaderIds.includes(userId),
    );
  }
}
