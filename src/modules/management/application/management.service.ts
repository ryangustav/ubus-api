import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE } from '../../../shared/database/database.module';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../../shared/database/schema';
import { and, eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';

const SYSTEM_MUNICIPALITY_ID = '00000000-0000-0000-0000-000000000001';

function normalizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

@Injectable()
export class ManagementService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async listActivePublic() {
    return this.db
      .select({
        id: schema.municipalities.id,
        name: schema.municipalities.name,
      })
      .from(schema.municipalities)
      .where(eq(schema.municipalities.active, true));
  }

  async create(dto: { name: string }) {
    const [municipality] = await this.db
      .insert(schema.municipalities)
      .values({ name: dto.name })
      .returning();
    return municipality;
  }

  async list(opts?: {
    excludeSystem?: boolean;
    municipalityId?: string;
  }) {
    const excludeSystem = opts?.excludeSystem ?? true;
    const municipalityId = opts?.municipalityId;

    if (municipalityId) {
      const [m] = await this.db
        .select()
        .from(schema.municipalities)
        .where(eq(schema.municipalities.id, municipalityId));
      return m ? [m] : [];
    }

    const rows = await this.db.select().from(schema.municipalities);
    if (excludeSystem) {
      return rows.filter((m) => m.id !== SYSTEM_MUNICIPALITY_ID);
    }
    return rows;
  }

  async findById(id: string) {
    const [m] = await this.db
      .select()
      .from(schema.municipalities)
      .where(eq(schema.municipalities.id, id));
    return m;
  }

  async update(id: string, dto: { name?: string; active?: boolean }) {
    const updates: Partial<typeof schema.municipalities.$inferInsert> = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.active !== undefined) updates.active = dto.active;

    if (id === SYSTEM_MUNICIPALITY_ID) {
      throw new ConflictException('Cannot modify System municipality');
    }

    const [updated] = await this.db
      .update(schema.municipalities)
      .set(updates)
      .where(eq(schema.municipalities.id, id))
      .returning();

    if (!updated) throw new NotFoundException('Municipality not found');
    return updated;
  }

  async setManager(municipalityId: string, userId: string) {
    const [existing] = await this.db
      .select()
      .from(schema.municipalities)
      .where(eq(schema.municipalities.id, municipalityId));

    if (!existing) {
      throw new ConflictException('Municipality not found');
    }

    if (existing.managerId) {
      throw new ConflictException('Municipality already has a manager');
    }

    const [updated] = await this.db
      .update(schema.municipalities)
      .set({ managerId: userId })
      .where(eq(schema.municipalities.id, municipalityId))
      .returning();

    return updated;
  }

  async createManager(dto: {
    municipalityId: string;
    cpf: string;
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) {
    if (dto.municipalityId === SYSTEM_MUNICIPALITY_ID) {
      throw new ConflictException(
        'Cannot create manager in System municipality',
      );
    }

    const [municipality] = await this.db
      .select()
      .from(schema.municipalities)
      .where(eq(schema.municipalities.id, dto.municipalityId));

    if (!municipality) throw new NotFoundException('Municipality not found');
    if (municipality.managerId) {
      throw new ConflictException('Municipality already has a manager');
    }

    const normalizedCpf = normalizeCpf(dto.cpf);

    const [existingEmail] = await this.db
      .select()
      .from(schema.users)
      .where(
        and(
          eq(schema.users.email, dto.email),
          eq(schema.users.municipalityId, dto.municipalityId),
        ),
      );

    const [existingCpf] = await this.db
      .select()
      .from(schema.users)
      .where(
        and(
          eq(schema.users.cpf, normalizedCpf),
          eq(schema.users.municipalityId, dto.municipalityId),
        ),
      );

    if (existingEmail)
      throw new ConflictException('Email already registered in this municipality');
    if (existingCpf)
      throw new ConflictException('CPF already registered in this municipality');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const [user] = await this.db
      .insert(schema.users)
      .values({
        municipalityId: dto.municipalityId,
        cpf: normalizedCpf,
        name: dto.name,
        email: dto.email,
        passwordHash: hashedPassword,
        phone: dto.phone ?? null,
        role: 'MANAGER',
      })
      .returning();

    await this.db
      .update(schema.municipalities)
      .set({ managerId: user.id })
      .where(eq(schema.municipalities.id, dto.municipalityId));

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }

  async removeManager(municipalityId: string) {
    if (municipalityId === SYSTEM_MUNICIPALITY_ID) {
      throw new ConflictException(
        'Cannot remove manager from System municipality',
      );
    }

    const [updated] = await this.db
      .update(schema.municipalities)
      .set({ managerId: null })
      .where(eq(schema.municipalities.id, municipalityId))
      .returning();

    if (!updated) throw new NotFoundException('Municipality not found');
    return updated;
  }
}
