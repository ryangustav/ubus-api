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
export class UsersService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async listPending(municipalityId: string) {
    return this.db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        cpf: schema.users.cpf,
        phone: schema.users.phone,
        role: schema.users.role,
        profilePictureUrl: schema.users.profilePictureUrl,
        scheduleUrl: schema.users.scheduleUrl,
        residenceProofUrl: schema.users.residenceProofUrl,
        needsWheelchair: schema.users.needsWheelchair,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .where(
        and(
          eq(schema.users.municipalityId, municipalityId),
          eq(schema.users.registrationStatus, 'PENDING'),
          eq(schema.users.role, 'STUDENT'),
        ),
      );
  }

  async updateStatus(
    id: string,
    status: 'APPROVED' | 'REJECTED',
    municipalityId: string,
  ) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id));

    if (!user) throw new NotFoundException('User not found');
    if (user.municipalityId !== municipalityId) {
      throw new ForbiddenException('User belongs to another municipality');
    }
    if (user.registrationStatus !== 'PENDING') {
      throw new ForbiddenException('User is not pending approval');
    }

    const [updated] = await this.db
      .update(schema.users)
      .set({ registrationStatus: status })
      .where(eq(schema.users.id, id))
      .returning({
        id: schema.users.id,
        registrationStatus: schema.users.registrationStatus,
      });

    return updated;
  }

  async updatePoint(userId: string, pointId: string) {
    const [point] = await this.db
      .select()
      .from(schema.points)
      .where(eq(schema.points.id, pointId));
    if (!point) throw new NotFoundException('Pick-up point not found');

    const [updated] = await this.db
      .update(schema.users)
      .set({ defaultPointId: pointId })
      .where(eq(schema.users.id, userId))
      .returning({
        id: schema.users.id,
        defaultPointId: schema.users.defaultPointId,
      });
    return updated;
  }
}
