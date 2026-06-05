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
   * Carteirinha Expiry - Runs daily at midnight.
   * Sets users with expiresAt < now() AND status is APPROVED to RENEWAL_PENDING,
   * and sets their renewalDeadline to now() + 14 days.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { name: 'expire-carteirinhas' })
  async handleExpiredCarteirinhas() {
    const now = new Date();
    this.logger.log(`[expire-carteirinhas] Running at ${now.toISOString()}`);

    const renewalDeadline = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const expired = await this.db
      .update(schema.users)
      .set({
        registrationStatus: 'RENEWAL_PENDING',
        renewalDeadline,
      })
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
      `[expire-carteirinhas] Set ${expired.length} expired users to RENEWAL_PENDING`,
    );
  }

  /**
   * Suspension - Runs daily at midnight.
   * Suspends users (status = 'SUSPENDED') if they are in RENEWAL_PENDING,
   * have not submitted a renewal, and renewalDeadline < now().
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { name: 'suspend-users' })
  async handleSuspendedUsers() {
    const now = new Date();
    this.logger.log(`[suspend-users] Running at ${now.toISOString()}`);

    const suspended = await this.db
      .update(schema.users)
      .set({
        registrationStatus: 'SUSPENDED',
      })
      .where(
        and(
          eq(schema.users.registrationStatus, 'RENEWAL_PENDING'),
          isNull(schema.users.renewalSubmittedAt),
          isNotNull(schema.users.renewalDeadline),
          lt(schema.users.renewalDeadline, now),
          isNull(schema.users.deletedAt),
        ),
      )
      .returning({ id: schema.users.id });

    this.logger.log(`[suspend-users] Suspended ${suspended.length} users`);
  }

  /**
   * Inactivation - Runs weekly.
   * Sets SUSPENDED users for > 180 days (renewalDeadline < 180 days ago)
   * to INACTIVE and marks them soft-deleted (deletedAt = now).
   */
  @Cron(CronExpression.EVERY_WEEK, { name: 'inactivate-users' })
  async handleInactivateUsers() {
    const now = new Date();
    const hundredEightyDaysAgo = new Date(
      now.getTime() - 180 * 24 * 60 * 60 * 1000,
    );
    this.logger.log(`[inactivate-users] Running at ${now.toISOString()}`);

    const inactivated = await this.db
      .update(schema.users)
      .set({
        registrationStatus: 'INACTIVE',
        deletedAt: now,
      })
      .where(
        and(
          eq(schema.users.registrationStatus, 'SUSPENDED'),
          isNotNull(schema.users.renewalDeadline),
          lt(schema.users.renewalDeadline, hundredEightyDaysAgo),
          isNull(schema.users.deletedAt),
        ),
      )
      .returning({ id: schema.users.id });

    this.logger.log(
      `[inactivate-users] Inactivated ${inactivated.length} users`,
    );
  }

  /**
   * Exclusion - Runs weekly.
   * Hard deletes INACTIVE users for > 180 days (deletedAt < 180 days ago).
   */
  @Cron(CronExpression.EVERY_WEEK, { name: 'delete-users' })
  async handleDeleteUsers() {
    const now = new Date();
    const hundredEightyDaysAgo = new Date(
      now.getTime() - 180 * 24 * 60 * 60 * 1000,
    );
    this.logger.log(`[delete-users] Running at ${now.toISOString()}`);

    const deleted = await this.db
      .delete(schema.users)
      .where(
        and(
          eq(schema.users.registrationStatus, 'INACTIVE'),
          isNotNull(schema.users.deletedAt),
          lt(schema.users.deletedAt, hundredEightyDaysAgo),
        ),
      )
      .returning({ id: schema.users.id });

    this.logger.log(`[delete-users] Hard deleted ${deleted.length} users`);
  }
}
