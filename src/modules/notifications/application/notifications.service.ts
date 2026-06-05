import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '../../../shared/database/database.module';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../../shared/database/schema';
import { eq, desc, and } from 'drizzle-orm';

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
}
