import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Inject } from '@nestjs/common';
import { DRIZZLE } from '../../../shared/database/database.module';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../../shared/database/schema';
import { and, eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { loginSchema, LoginDto } from './dto/login.dto';
import { registerSchema } from './dto/register.dto';
import type { JwtPayload } from '../infrastructure/strategies/jwt.strategy';

function normalizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
    private jwt: JwtService,
  ) {}

  async register(dto: unknown) {
    const parsed = registerSchema.safeParse(dto);
    if (!parsed.success) {
      throw new ConflictException(parsed.error.flatten().fieldErrors);
    }

    const cpfNorm = normalizeCpf(parsed.data.cpf);
    const { idPrefeitura } = parsed.data;

    const [prefeitura] = await this.db
      .select()
      .from(schema.prefeituras)
      .where(eq(schema.prefeituras.id, idPrefeitura));
    if (!prefeitura) throw new ConflictException('Prefeitura não encontrada');
    if (prefeitura.ativo === false) {
      throw new ConflictException('Cadastros pausados para esta prefeitura');
    }

    const [existingEmail] = await this.db
      .select()
      .from(schema.usuarios)
      .where(
        and(
          eq(schema.usuarios.email, parsed.data.email),
          eq(schema.usuarios.idPrefeitura, idPrefeitura),
        ),
      );

    const [existingCpf] = await this.db
      .select()
      .from(schema.usuarios)
      .where(
        and(
          eq(schema.usuarios.cpf, cpfNorm),
          eq(schema.usuarios.idPrefeitura, idPrefeitura),
        ),
      );

    if (existingEmail) {
      throw new ConflictException('Email já cadastrado nesta prefeitura');
    }

    if (existingCpf) {
      throw new ConflictException('CPF já cadastrado nesta prefeitura');
    }

    if (parsed.data.role === 'GESTOR') {
      const [prefeitura] = await this.db
        .select()
        .from(schema.prefeituras)
        .where(eq(schema.prefeituras.id, idPrefeitura));
      if (prefeitura?.idGestor) {
        throw new ConflictException('Prefeitura já possui gestor');
      }
    }

    const hash = await bcrypt.hash(parsed.data.senha, 10);
    const [user] = await this.db
      .insert(schema.usuarios)
      .values({
        idPrefeitura,
        cpf: cpfNorm,
        nome: parsed.data.nome,
        email: parsed.data.email,
        senhaHash: hash,
        telefone: parsed.data.telefone,
        role: parsed.data.role,
        nivelPrioridade: parsed.data.nivelPrioridade,
        idLinhaPadrao: parsed.data.idLinhaPadrao ?? null,
      })
      .returning();

    if (parsed.data.role === 'GESTOR') {
      await this.db
        .update(schema.prefeituras)
        .set({ idGestor: user.id })
        .where(eq(schema.prefeituras.id, idPrefeitura));
    }

    return this.login({
      email: user.email,
      senha: parsed.data.senha,
    });
  }

  async login(dto: LoginDto) {
    const parsed = loginSchema.safeParse(dto);
    if (!parsed.success) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const [user] = await this.db
      .select({
        user: schema.usuarios,
        prefeitura: schema.prefeituras,
      })
      .from(schema.usuarios)
      .leftJoin(
        schema.prefeituras,
        eq(schema.usuarios.idPrefeitura, schema.prefeituras.id),
      )
      .where(eq(schema.usuarios.email, parsed.data.email));

    if (!user?.user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const u = user.user;
    if (user.prefeitura?.ativo === false) {
      throw new UnauthorizedException(
        'Prefeitura pausada. Contate o administrador.',
      );
    }

    const valid = await bcrypt.compare(parsed.data.senha, u.senhaHash);
    if (!valid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const payload: JwtPayload = {
      sub: u.id,
      email: u.email,
      role: u.role ?? 'ALUNO',
      prefeituraId: u.idPrefeitura,
    };

    const accessToken = this.jwt.sign(payload, {
      expiresIn: '7d',
    });

    return {
      accessToken,
      user: {
        id: u.id,
        email: u.email,
        nome: u.nome,
        role: u.role,
        prefeituraId: u.idPrefeitura,
        nivelPrioridade: u.nivelPrioridade,
      },
    };
  }
}
