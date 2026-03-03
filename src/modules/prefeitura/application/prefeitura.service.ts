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

const SISTEMA_PREFEITURA_ID = '00000000-0000-0000-0000-000000000001';

function normalizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

@Injectable()
export class PrefeituraService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async create(dto: { nome: string }) {
    const [prefeitura] = await this.db
      .insert(schema.prefeituras)
      .values({ nome: dto.nome })
      .returning();
    return prefeitura;
  }

  async list(opts?: { excluirSistema?: boolean; idPrefeitura?: string }) {
    const excluirSistema = opts?.excluirSistema ?? true;
    const idPrefeitura = opts?.idPrefeitura;

    if (idPrefeitura) {
      const [p] = await this.db
        .select()
        .from(schema.prefeituras)
        .where(eq(schema.prefeituras.id, idPrefeitura));
      return p ? [p] : [];
    }

    const rows = await this.db.select().from(schema.prefeituras);
    if (excluirSistema) {
      return rows.filter((p) => p.id !== SISTEMA_PREFEITURA_ID);
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

  async update(
    id: string,
    dto: { nome?: string; ativo?: boolean },
  ) {
    const updates: Partial<typeof schema.prefeituras.$inferInsert> = {};
    if (dto.nome !== undefined) updates.nome = dto.nome;
    if (dto.ativo !== undefined) updates.ativo = dto.ativo;

    if (id === SISTEMA_PREFEITURA_ID) {
      throw new ConflictException('Não é possível alterar a prefeitura Sistema');
    }

    const [updated] = await this.db
      .update(schema.prefeituras)
      .set(updates)
      .where(eq(schema.prefeituras.id, id))
      .returning();

    if (!updated) throw new NotFoundException('Prefeitura não encontrada');
    return updated;
  }

  async setGestor(idPrefeitura: string, idUsuario: string) {
    const [existing] = await this.db
      .select()
      .from(schema.prefeituras)
      .where(eq(schema.prefeituras.id, idPrefeitura));

    if (!existing) {
      throw new ConflictException('Prefeitura não encontrada');
    }

    if (existing.idGestor) {
      throw new ConflictException('Prefeitura já possui gestor');
    }

    const [updated] = await this.db
      .update(schema.prefeituras)
      .set({ idGestor: idUsuario })
      .where(eq(schema.prefeituras.id, idPrefeitura))
      .returning();

    return updated!;
  }

  async createGestor(dto: {
    idPrefeitura: string;
    cpf: string;
    nome: string;
    email: string;
    senha: string;
    telefone?: string;
  }) {
    if (dto.idPrefeitura === SISTEMA_PREFEITURA_ID) {
      throw new ConflictException('Não é possível criar gestor na prefeitura Sistema');
    }

    const [prefeitura] = await this.db
      .select()
      .from(schema.prefeituras)
      .where(eq(schema.prefeituras.id, dto.idPrefeitura));

    if (!prefeitura) throw new NotFoundException('Prefeitura não encontrada');
    if (prefeitura.idGestor) {
      throw new ConflictException('Prefeitura já possui gestor');
    }

    const cpfNorm = normalizeCpf(dto.cpf);

    const [existingEmail] = await this.db
      .select()
      .from(schema.usuarios)
      .where(
        and(
          eq(schema.usuarios.email, dto.email),
          eq(schema.usuarios.idPrefeitura, dto.idPrefeitura),
        ),
      );

    const [existingCpf] = await this.db
      .select()
      .from(schema.usuarios)
      .where(
        and(
          eq(schema.usuarios.cpf, cpfNorm),
          eq(schema.usuarios.idPrefeitura, dto.idPrefeitura),
        ),
      );

    if (existingEmail) throw new ConflictException('Email já cadastrado nesta prefeitura');
    if (existingCpf) throw new ConflictException('CPF já cadastrado nesta prefeitura');

    const senhaHash = await bcrypt.hash(dto.senha, 10);
    const [user] = await this.db
      .insert(schema.usuarios)
      .values({
        idPrefeitura: dto.idPrefeitura,
        cpf: cpfNorm,
        nome: dto.nome,
        email: dto.email,
        senhaHash,
        telefone: dto.telefone ?? null,
        role: 'GESTOR',
      })
      .returning();

    await this.db
      .update(schema.prefeituras)
      .set({ idGestor: user.id })
      .where(eq(schema.prefeituras.id, dto.idPrefeitura));

    return user;
  }

  async removeGestor(idPrefeitura: string) {
    if (idPrefeitura === SISTEMA_PREFEITURA_ID) {
      throw new ConflictException('Não é possível remover gestor da prefeitura Sistema');
    }

    const [updated] = await this.db
      .update(schema.prefeituras)
      .set({ idGestor: null })
      .where(eq(schema.prefeituras.id, idPrefeitura))
      .returning();

    if (!updated) throw new NotFoundException('Prefeitura não encontrada');
    return updated;
  }
}
