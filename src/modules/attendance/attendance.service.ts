import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '../../shared/database/database.module';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../shared/database/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class AttendanceService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async getAttendanceScore(studentId: string) {
    // 1. Fetch all reservations for this student
    const reservations = await this.db
      .select({
        id: schema.reservations.id,
        status: schema.reservations.status,
        createdAt: schema.reservations.createdAt,
      })
      .from(schema.reservations)
      .where(eq(schema.reservations.userId, studentId));

    const presentCount = reservations.filter(
      (r) => r.status === 'PRESENT',
    ).length;
    const absentCount = reservations.filter(
      (r) => r.status === 'ABSENT',
    ).length;
    const totalCount = presentCount + absentCount;

    let score = 100.0;
    if (totalCount > 0) {
      score = (presentCount / totalCount) * 100;
    }

    const badges: string[] = [];

    // Award badges based on gamified criteria:
    // 1. PUNCTUAL: score >= 90% and at least 3 PRESENTs
    if (score >= 90.0 && presentCount >= 3) {
      badges.push('PUNCTUAL');
    }

    // 2. FREQUENT_RIDER: at least 10 PRESENTs
    if (presentCount >= 10) {
      badges.push('FREQUENT_RIDER');
    }

    // 3. ECO_FRIENDLY: at least 5 PRESENTs
    if (presentCount >= 5) {
      badges.push('ECO_FRIENDLY');
    }

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 4. PERFECT_WEEK: At least 3 PRESENTs and 0 ABSENTs in the last 7 days
    const lastWeekReservations = reservations.filter(
      (r) => r.createdAt && new Date(r.createdAt) >= oneWeekAgo,
    );
    const lastWeekPresents = lastWeekReservations.filter(
      (r) => r.status === 'PRESENT',
    ).length;
    const lastWeekAbsents = lastWeekReservations.filter(
      (r) => r.status === 'ABSENT',
    ).length;
    if (lastWeekPresents >= 3 && lastWeekAbsents === 0) {
      badges.push('PERFECT_WEEK');
    }

    // 5. PERFECT_MONTH: At least 10 PRESENTs and 0 ABSENTs in the last 30 days
    const lastMonthReservations = reservations.filter(
      (r) => r.createdAt && new Date(r.createdAt) >= oneMonthAgo,
    );
    const lastMonthPresents = lastMonthReservations.filter(
      (r) => r.status === 'PRESENT',
    ).length;
    const lastMonthAbsents = lastMonthReservations.filter(
      (r) => r.status === 'ABSENT',
    ).length;
    if (lastMonthPresents >= 10 && lastMonthAbsents === 0) {
      badges.push('PERFECT_MONTH');
    }

    return {
      userId: studentId,
      score,
      badges,
    };
  }
}
