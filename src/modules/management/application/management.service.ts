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
import * as bcrypt from 'bcrypt';

const SYSTEM_MUNICIPALITY_ID = '00000000-0000-0000-0000-000000000001';

function normalizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

@Injectable()
export class ManagementService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async create(dto: { name: string }) {
    const [municipality] = await this.db
      .insert(schema.prefeituras)
      .values({ nome: dto.name })
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
      const [p] = await this.db
        .select()
        .from(schema.prefeituras)
        .where(eq(schema.prefeituras.id, municipalityId));
      return p ? [p] : [];
    }

    const rows = await this.db.select().from(schema.prefeituras);
    if (excludeSystem) {
      return rows.filter((p) => p.id !== SYSTEM_MUNICIPALITY_ID);
    }
    return rows;
  }

  async findById(id: string) {
    const [p] = await this.db
      .select()
      .from(schema.prefeituras)
      .where(eq(schema.prefeituras.id, id));
    return p;
  }

  async update(id: string, dto: { name?: string; active?: boolean }) {
    const updates: Partial<typeof schema.prefeituras.$inferInsert> = {};
    if (dto.name !== undefined) updates.nome = dto.name;
    if (dto.active !== undefined) updates.ativo = dto.active;

    if (id === SYSTEM_MUNICIPALITY_ID) {
      throw new ConflictException('Cannot modify System municipality');
    }

    const [updated] = await this.db
      .update(schema.prefeituras)
      .set(updates)
      .where(eq(schema.prefeituras.id, id))
      .returning();

    if (!updated) throw new NotFoundException('Municipality not found');
    return updated;
  }

  async setManager(municipalityId: string, userId: string) {
    const [existing] = await this.db
      .select()
      .from(schema.prefeituras)
      .where(eq(schema.prefeituras.id, municipalityId));

    if (!existing) {
      throw new ConflictException('Municipality not found');
    }

    if (existing.idGestor) {
      throw new ConflictException('Municipality already has a manager');
    }

    const [updated] = await this.db
      .update(schema.prefeituras)
      .set({ idGestor: userId })
      .where(eq(schema.prefeituras.id, municipalityId))
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
      .from(schema.prefeituras)
      .where(eq(schema.prefeituras.id, dto.municipalityId));

    if (!municipality) throw new NotFoundException('Municipality not found');
    if (municipality.idGestor) {
      throw new ConflictException('Municipality already has a manager');
    }

    const cpfNorm = normalizeCpf(dto.cpf);

    const [existingEmail] = await this.db
      .select()
      .from(schema.usuarios)
      .where(
        and(
          eq(schema.usuarios.email, dto.email),
          eq(schema.usuarios.idPrefeitura, dto.municipalityId),
        ),
      );

    const [existingCpf] = await this.db
      .select()
      .from(schema.usuarios)
      .where(
        and(
          eq(schema.usuarios.cpf, cpfNorm),
          eq(schema.usuarios.idPrefeitura, dto.municipalityId),
        ),
      );

    if (existingEmail)
      throw new ConflictException('Email already registered in this municipality');
    if (existingCpf)
      throw new ConflictException('CPF already registered in this municipality');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const [user] = await this.db
      .insert(schema.usuarios)
      .values({
        idPrefeitura: dto.municipalityId,
        cpf: cpfNorm,
        nome: dto.name,
        email: dto.email,
        senhaHash: passwordHash,
        telefone: dto.phone ?? null,
        role: 'GESTOR',
      })
      .returning();

    await this.db
      .update(schema.prefeituras)
      .set({ idGestor: user.id })
      .where(eq(schema.prefeituras.id, dto.municipalityId));

    return user;
  }

  async removeManager(municipalityId: string) {
    if (municipalityId === SYSTEM_MUNICIPALITY_ID) {
      throw new ConflictException(
        'Cannot remove manager from System municipality',
      );
    }

    const [updated] = await this.db
      .update(schema.prefeituras)
      .set({ idGestor: null })
      .where(eq(schema.prefeituras.id, municipalityId))
      .returning();

    if (!updated) throw new NotFoundException('Municipality not found');
    return updated;
  }
}
