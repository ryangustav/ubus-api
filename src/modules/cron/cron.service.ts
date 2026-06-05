import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DRIZZLE } from '../../shared/database/database.module';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../shared/database/schema';
import { and, eq, lt, isNull, isNotNull } from 'drizzle-orm';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  /**
   * Runs daily at 02:00 — marks users whose semester has expired.
   * Sets registrationStatus = INACTIVE and clears accessibility if expired.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM, { name: 'expire-semesters' })
  async handleExpiredSemesters() {
    const now = new Date();
    this.logger.log(`[expire-semesters] Running at ${now.toISOString()}`);

    // 1) Mark users whose expiresAt < now AND status is APPROVED → INACTIVE
    const expired = await this.db
      .update(schema.users)
      .set({ registrationStatus: 'INACTIVE' })
      .where(
        and(
          eq(schema.users.registrationStatus, 'APPROVED'),
          isNotNull(schema.users.expiresAt),
          lt(schema.users.expiresAt, now),
          isNull(schema.users.deletedAt),
        ),
      )
      .returning({ id: schema.users.id });

    this.logger.log(
      `[expire-semesters] Marked ${expired.length} users as INACTIVE`,
    );

    // 2) Expire accessibility approvals that are older than the semester deadline
    const expiredAccessibility = await this.db
      .update(schema.users)
      .set({ accessibilityStatus: 'EXPIRED' })
      .where(
        and(
          eq(schema.users.accessibilityStatus, 'APPROVED'),
          isNotNull(schema.users.expiresAt),
          lt(schema.users.expiresAt, now),
          isNull(schema.users.deletedAt),
        ),
      )
      .returning({ id: schema.users.id });

    this.logger.log(
      `[expire-semesters] Expired ${expiredAccessibility.length} accessibility approvals`,
    );
  }

  /**
   * Runs daily at 06:00 — sends renewal reminders 30 days before expiry.
   * This is a stub; actual notification sending depends on the notifications module.
   */
  @Cron(CronExpression.EVERY_DAY_AT_6AM, { name: 'renewal-reminders' })
  async handleRenewalReminders() {
    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    );
    this.logger.log(`[renewal-reminders] Running at ${now.toISOString()}`);

    const usersNearExpiry = await this.db
      .select({ id: schema.users.id, email: schema.users.email })
      .from(schema.users)
      .where(
        and(
          eq(schema.users.registrationStatus, 'APPROVED'),
          isNotNull(schema.users.expiresAt),
          lt(schema.users.expiresAt, thirtyDaysFromNow),
          isNull(schema.users.deletedAt),
        ),
      );

    this.logger.log(
      `[renewal-reminders] Found ${usersNearExpiry.length} users near expiry`,
    );

    // TODO: integrate with NotificationsModule to send push/email notifications
  }
}
