import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE } from '../../../shared/database/database.module';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../../shared/database/schema';
import { and, eq, isNull } from 'drizzle-orm';

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  // ── List with filters ────────────────────────────────
  async listUsers(
    municipalityId: string,
    filters: { role?: string; status?: string },
  ) {
    const conditions = [
      eq(schema.users.municipalityId, municipalityId),
      isNull(schema.users.deletedAt),
    ];

    if (filters.role) {
      conditions.push(eq(schema.users.role, filters.role as any));
    }
    if (filters.status) {
      conditions.push(
        eq(schema.users.registrationStatus, filters.status as any),
      );
    }

    return this.db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        cpf: schema.users.cpf,
        phone: schema.users.phone,
        role: schema.users.role,
        registrationStatus: schema.users.registrationStatus,
        profilePictureUrl: schema.users.profilePictureUrl,
        needsWheelchair: schema.users.needsWheelchair,
        accessibilityReason: schema.users.accessibilityReason,
        accessibilityStatus: schema.users.accessibilityStatus,
        expiresAt: schema.users.expiresAt,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .where(and(...conditions));
  }

  // ── Pending ──────────────────────────────────────────
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
          isNull(schema.users.deletedAt),
        ),
      );
  }

  // ── Update Status (Approve/Reject) ───────────────────
  async updateStatus(
    id: string,
    status: 'APPROVED' | 'REJECTED',
    municipalityId: string,
    role?: string,
  ) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id));

    if (!user) throw new NotFoundException('User not found');
    if (user.municipalityId !== municipalityId && role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('User belongs to another municipality');
    }
    if (
      user.registrationStatus !== 'PENDING' &&
      user.registrationStatus !== 'RENEWAL_PENDING'
    ) {
      throw new ForbiddenException('User is not pending approval');
    }

    const updateSet: Partial<typeof schema.users.$inferInsert> = {
      registrationStatus: status,
    };

    // When approving, set semester expiry to 6 months from now
    if (status === 'APPROVED') {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 6);
      updateSet.expiresAt = expiresAt;
    }

    const [updated] = await this.db
      .update(schema.users)
      .set(updateSet)
      .where(eq(schema.users.id, id))
      .returning({
        id: schema.users.id,
        registrationStatus: schema.users.registrationStatus,
        expiresAt: schema.users.expiresAt,
      });

    return updated;
  }

  // ── Update Point ─────────────────────────────────────
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

  // ── Get Me ───────────────────────────────────────────
  async getMe(userId: string) {
    const [user] = await this.db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        cpf: schema.users.cpf,
        phone: schema.users.phone,
        role: schema.users.role,
        municipalityId: schema.users.municipalityId,
        defaultPointId: schema.users.defaultPointId,
        profilePictureUrl: schema.users.profilePictureUrl,
        registrationStatus: schema.users.registrationStatus,
        needsWheelchair: schema.users.needsWheelchair,
        expiresAt: schema.users.expiresAt,
        renewalDeadline: schema.users.renewalDeadline,
        accessibilityReason: schema.users.accessibilityReason,
        accessibilityStatus: schema.users.accessibilityStatus,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .where(and(eq(schema.users.id, userId), isNull(schema.users.deletedAt)));

    if (!user) throw new NotFoundException('User not found');

    // Masking CPF (e.g. 12345678901 -> ***.*56.789-**)
    let maskedCpf = user.cpf;
    if (maskedCpf) {
      const d = maskedCpf.replace(/\D/g, '');
      if (d.length === 11) {
        maskedCpf = `***.*${d.slice(4, 6)}.${d.slice(6, 9)}-**`;
      }
    }

    // Masking Phone (e.g. 79999991234 -> (**) * ****-1234)
    let maskedPhone = user.phone;
    if (maskedPhone) {
      const d = maskedPhone.replace(/\D/g, '');
      if (d.length >= 10) {
        if (d.length === 11) {
          maskedPhone = `(**) * ****-${d.slice(-4)}`;
        } else {
          maskedPhone = `(**) ****-${d.slice(-4)}`;
        }
      }
    }

    return {
      ...user,
      cpf: maskedCpf,
      phone: maskedPhone,
    };
  }

  // ── Update Me ────────────────────────────────────────
  async updateMe(
    userId: string,
    body: {
      name?: string;
      phone?: string;
      photoUrl?: string;
      needsWheelchair?: boolean;
    },
  ) {
    const updates: Partial<typeof schema.users.$inferInsert> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.photoUrl !== undefined) updates.profilePictureUrl = body.photoUrl;
    if (body.needsWheelchair !== undefined)
      updates.needsWheelchair = body.needsWheelchair;

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException('No fields to update');
    }

    const [updated] = await this.db
      .update(schema.users)
      .set(updates)
      .where(eq(schema.users.id, userId))
      .returning({
        id: schema.users.id,
        name: schema.users.name,
        phone: schema.users.phone,
        profilePictureUrl: schema.users.profilePictureUrl,
        needsWheelchair: schema.users.needsWheelchair,
      });

    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }

  // ── Semester Renewal ─────────────────────────────────
  async submitRenewal(
    userId: string,
    dto: { gradeFileUrl: string; residenciaFileUrl?: string },
  ) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId));

    if (!user) throw new NotFoundException('User not found');
    if (
      user.registrationStatus !== 'APPROVED' &&
      user.registrationStatus !== 'INACTIVE'
    ) {
      throw new ForbiddenException(
        'Only approved or inactive users can submit renewal',
      );
    }

    const [updated] = await this.db
      .update(schema.users)
      .set({
        registrationStatus: 'RENEWAL_PENDING',
        scheduleUrl: dto.gradeFileUrl,
        residenceProofUrl: dto.residenciaFileUrl ?? user.residenceProofUrl,
        renewalSubmittedAt: new Date(),
      })
      .where(eq(schema.users.id, userId))
      .returning({
        id: schema.users.id,
        registrationStatus: schema.users.registrationStatus,
        renewalSubmittedAt: schema.users.renewalSubmittedAt,
      });

    return updated;
  }

  async reviewRenewal(
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
    if (user.registrationStatus !== 'RENEWAL_PENDING') {
      throw new ForbiddenException('User is not pending renewal');
    }

    const updateSet: Partial<typeof schema.users.$inferInsert> = {
      registrationStatus: status,
    };

    if (status === 'APPROVED') {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 6);
      updateSet.expiresAt = expiresAt;
    }

    const [updated] = await this.db
      .update(schema.users)
      .set(updateSet)
      .where(eq(schema.users.id, id))
      .returning({
        id: schema.users.id,
        registrationStatus: schema.users.registrationStatus,
        expiresAt: schema.users.expiresAt,
      });

    return updated;
  }

  // ── Accessibility ────────────────────────────────────
  async requestAccessibility(
    userId: string,
    dto: { reason: string; proofDocUrl: string },
  ) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId));

    if (!user) throw new NotFoundException('User not found');
    if (user.accessibilityStatus === 'APPROVED') {
      throw new ForbiddenException(
        'You already have an approved accessibility status',
      );
    }

    const [updated] = await this.db
      .update(schema.users)
      .set({
        accessibilityReason: dto.reason as any,
        accessibilityDocUrl: dto.proofDocUrl,
        accessibilityStatus: 'PENDING_REVIEW',
      })
      .where(eq(schema.users.id, userId))
      .returning({
        id: schema.users.id,
        accessibilityReason: schema.users.accessibilityReason,
        accessibilityStatus: schema.users.accessibilityStatus,
      });

    return updated;
  }

  async listAccessibilityPending(municipalityId: string) {
    return this.db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        accessibilityReason: schema.users.accessibilityReason,
        accessibilityDocUrl: schema.users.accessibilityDocUrl,
        accessibilityStatus: schema.users.accessibilityStatus,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .where(
        and(
          eq(schema.users.municipalityId, municipalityId),
          eq(schema.users.accessibilityStatus, 'PENDING_REVIEW'),
          isNull(schema.users.deletedAt),
        ),
      );
  }

  async reviewAccessibility(
    id: string,
    dto: { status: 'APPROVED' | 'REJECTED'; note?: string },
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
    if (user.accessibilityStatus !== 'PENDING_REVIEW') {
      throw new ForbiddenException(
        'Accessibility review not pending for this user',
      );
    }

    const updateSet: Partial<typeof schema.users.$inferInsert> = {
      accessibilityStatus: dto.status,
      accessibilityReviewNote: dto.note ?? null,
    };

    if (dto.status === 'APPROVED') {
      updateSet.accessibilityApprovedAt = new Date();
      updateSet.accessibilityConsecutivePeriods =
        (user.accessibilityConsecutivePeriods ?? 0) + 1;
    }

    const [updated] = await this.db
      .update(schema.users)
      .set(updateSet)
      .where(eq(schema.users.id, id))
      .returning({
        id: schema.users.id,
        accessibilityStatus: schema.users.accessibilityStatus,
        accessibilityApprovedAt: schema.users.accessibilityApprovedAt,
        accessibilityReviewNote: schema.users.accessibilityReviewNote,
      });

    return updated;
  }

  // ── Soft Delete ──────────────────────────────────────
  async softDelete(id: string, municipalityId: string, role: string) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id));

    if (!user) throw new NotFoundException('User not found');
    if (user.municipalityId !== municipalityId && role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('User belongs to another municipality');
    }

    const [updated] = await this.db
      .update(schema.users)
      .set({
        deletedAt: new Date(),
        registrationStatus: 'INACTIVE',
      })
      .where(eq(schema.users.id, id))
      .returning({
        id: schema.users.id,
        deletedAt: schema.users.deletedAt,
      });

    return updated;
  }
}
