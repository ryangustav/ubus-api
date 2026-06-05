import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DRIZZLE } from '../../../shared/database/database.module';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../../shared/database/schema';
import { eq, desc, and, isNull } from 'drizzle-orm';

@Injectable()
export class NotificationsService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async listByUser(userId: string) {
    return this.db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.userId, userId))
      .orderBy(desc(schema.notifications.createdAt));
  }

  async markAsRead(id: string, userId: string) {
    const [notification] = await this.db
      .update(schema.notifications)
      .set({ read: true })
      .where(
        and(
          eq(schema.notifications.id, id),
          eq(schema.notifications.userId, userId),
        ),
      )
      .returning();

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async sendNotification(
    dto: {
      title: string;
      message: string;
      target: 'MUNICIPALITY' | 'ROUTE';
      targetId: string;
    },
    userMunicipalityId: string,
    userRole: string,
  ) {
    // 1. Validate permissions
    if (
      dto.target === 'MUNICIPALITY' &&
      dto.targetId !== userMunicipalityId &&
      userRole !== 'SUPER_ADMIN'
    ) {
      throw new ForbiddenException(
        'Cannot send notifications to another municipality',
      );
    }

    if (dto.target === 'ROUTE') {
      const [route] = await this.db
        .select()
        .from(schema.routes)
        .where(eq(schema.routes.id, dto.targetId));
      if (!route) {
        throw new NotFoundException('Route not found');
      }
      if (
        route.municipalityId !== userMunicipalityId &&
        userRole !== 'SUPER_ADMIN'
      ) {
        throw new ForbiddenException('Route belongs to another municipality');
      }
    }

    // 2. Query target users
    const conditions = [
      isNull(schema.users.deletedAt),
      eq(schema.users.registrationStatus, 'APPROVED'),
    ];

    if (dto.target === 'MUNICIPALITY') {
      conditions.push(eq(schema.users.municipalityId, dto.targetId));
    } else {
      conditions.push(eq(schema.users.defaultRouteId, dto.targetId));
    }

    const targetUsers = await this.db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(and(...conditions));

    if (targetUsers.length === 0) {
      return { recipientCount: 0 };
    }

    // 3. Batch insert notifications
    const notificationInserts = targetUsers.map((u) => ({
      userId: u.id,
      title: dto.title,
      content: dto.message,
      read: false,
    }));

    await this.db.insert(schema.notifications).values(notificationInserts);

    return { recipientCount: targetUsers.length };
  }
}
