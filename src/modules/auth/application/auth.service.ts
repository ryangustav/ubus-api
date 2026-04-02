import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Inject } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import type Redis from 'ioredis';
import { DRIZZLE } from '../../../shared/database/database.module';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../../shared/database/schema';
import { and, eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { loginSchema, LoginDto } from './dto/login.dto';
import { registerSchema } from './dto/register.dto';
import { passwordRedefinitionSchema } from './dto/password-reset.dto';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../../../shared/email/email.service';
import type { JwtPayload } from '../infrastructure/strategies/jwt.strategy';

const PASSWORD_RESET_PREFIX = 'password-reset:';
const PASSWORD_RESET_TTL = 3600; // 1 hour

function normalizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
    private jwt: JwtService,
    @InjectRedis() private redis: Redis,
    private emailService: EmailService,
    private config: ConfigService,
  ) {}

  async register(dto: unknown) {
    const parsed = registerSchema.safeParse(dto);
    if (!parsed.success) {
      throw new ConflictException(parsed.error.flatten().fieldErrors);
    }

    const normalizedCpf = normalizeCpf(parsed.data.cpf);
    const { municipalityId } = parsed.data;

    const [municipality] = await this.db
      .select()
      .from(schema.municipalities)
      .where(eq(schema.municipalities.id, municipalityId));
    if (!municipality) throw new ConflictException('Municipality not found');
    if (municipality.active === false) {
      throw new ConflictException('Registrations paused for this municipality');
    }

    const [existingEmail] = await this.db
      .select()
      .from(schema.users)
      .where(
        and(
          eq(schema.users.email, parsed.data.email),
          eq(schema.users.municipalityId, municipalityId),
        ),
      );

    const [existingCpf] = await this.db
      .select()
      .from(schema.users)
      .where(
        and(
          eq(schema.users.cpf, normalizedCpf),
          eq(schema.users.municipalityId, municipalityId),
        ),
      );

    if (existingEmail) {
      throw new ConflictException('Email already registered in this municipality');
    }

    if (existingCpf) {
      throw new ConflictException('CPF already registered in this municipality');
    }

    if (parsed.data.role === 'MANAGER') {
      const [munity] = await this.db
        .select()
        .from(schema.municipalities)
        .where(eq(schema.municipalities.id, municipalityId));
      if (munity?.managerId) {
        throw new ConflictException('Municipality already has a manager');
      }
    }

    const hash = await bcrypt.hash(parsed.data.password, 10);
    const [user] = await this.db
      .insert(schema.users)
      .values({
        municipalityId: municipalityId,
        cpf: normalizedCpf,
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash: hash,
        phone: parsed.data.phone,
        role: parsed.data.role,
        priorityLevel: parsed.data.priorityLevel,
        defaultRouteId: parsed.data.defaultRouteId ?? null,
        profilePictureUrl: parsed.data.photoUrl ?? null,
        scheduleUrl: parsed.data.gradeFileUrl ?? null,
        residenceProofUrl: parsed.data.residenciaFileUrl ?? null,
        needsWheelchair: parsed.data.needsWheelchair ?? false,
      })
      .returning();

    if (parsed.data.role === 'MANAGER') {
      await this.db
        .update(schema.municipalities)
        .set({ managerId: user.id })
        .where(eq(schema.municipalities.id, municipalityId));
    }

    return this.login({
      email: user.email,
      password: parsed.data.password,
    });
  }

  async login(dto: LoginDto) {
    const parsed = loginSchema.safeParse(dto);
    if (!parsed.success) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const [data] = await this.db
      .select({
        user: schema.users,
        municipality: schema.municipalities,
      })
      .from(schema.users)
      .leftJoin(
        schema.municipalities,
        eq(schema.users.municipalityId, schema.municipalities.id),
      )
      .where(eq(schema.users.email, parsed.data.email));

    if (!data?.user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const u = data.user;
    if (data.municipality?.active === false) {
      throw new UnauthorizedException(
        'Municipality paused. Contact administrator.',
      );
    }

    const valid = await bcrypt.compare(parsed.data.password, u.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: u.id,
      email: u.email,
      role: u.role ?? 'STUDENT',
      municipalityId: u.municipalityId,
    };

    const accessToken = this.jwt.sign(payload, {
      expiresIn: '7d',
    });

    return {
      accessToken,
      user: {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        cpf: u.cpf,
        phone: u.phone,
        municipalityId: u.municipalityId,
        priorityLevel: u.priorityLevel,
        defaultRouteId: u.defaultRouteId,
      },
    };
  }

  async sendPasswordResetEmail(userId: string): Promise<{ message: string }> {
    const [user] = await this.db
      .select({
        id: schema.users.id,
        email: schema.users.email,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId));

    if (!user) throw new UnauthorizedException('User not found');

    const token = randomBytes(32).toString('hex'); // 64 chars
    const redisKey = `${PASSWORD_RESET_PREFIX}${token}`;
    await this.redis.setex(redisKey, PASSWORD_RESET_TTL, user.id);

    const frontendUrl =
      this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const resetUrl = `${frontendUrl}/user/reset-password?token=${token}`;

    await this.emailService.sendPasswordResetEmail(user.email, resetUrl);

    return { message: 'Password reset email sent' };
  }

  getPasswordResetEmailPreview(): string {
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const token = 'x'.repeat(64);
    const resetUrl = `${frontendUrl}/user/reset-password?token=${token}`;
    return this.emailService.getPasswordResetEmailHtml(resetUrl);
  }

  async resetPassword(dto: unknown): Promise<{ message: string }> {
    const parsed = passwordRedefinitionSchema.safeParse(dto);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    const { token, password } = parsed.data;
    const redisKey = `${PASSWORD_RESET_PREFIX}${token}`;
    const userId = await this.redis.get(redisKey);

    if (!userId) {
      throw new BadRequestException('Invalid or expired token');
    }

    const hash = await bcrypt.hash(password, 10);
    await this.db
      .update(schema.users)
      .set({ passwordHash: hash })
      .where(eq(schema.users.id, userId));

    await this.redis.del(redisKey);

    return { message: 'Password reset successfully' };
  }
}
