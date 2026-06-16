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
import { randomBytes, randomInt } from 'crypto';
import { loginSchema, LoginDto } from './dto/login.dto';
import { registerSchema } from './dto/register.dto';
import { passwordRedefinitionSchema } from './dto/password-reset.dto';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../../../shared/email/email.service';
import type { JwtPayload } from '../infrastructure/strategies/jwt.strategy';
import { mapUserToDto } from '../../users/application/users.service';

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
      throw new ConflictException(
        'Email already registered in this municipality',
      );
    }

    if (existingCpf) {
      throw new ConflictException(
        'CPF already registered in this municipality',
      );
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
    const verificationCode = randomInt(100000, 1000000).toString();

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
        accessibilityReason: (parsed.data.accessibilityReason as any) ?? null,
        accessibilityDocUrl: parsed.data.accessibilityDocUrl ?? null,
        accessibilityStatus: parsed.data.accessibilityReason
          ? 'PENDING_REVIEW'
          : null,
        emailVerificationCode: verificationCode,
      })
      .returning();

    if (parsed.data.role === 'MANAGER') {
      await this.db
        .update(schema.municipalities)
        .set({ managerId: user.id })
        .where(eq(schema.municipalities.id, municipalityId));
    }

    if (parsed.data.needsWheelchair && parsed.data.defaultRouteId) {
      await this.db
        .update(schema.routes)
        .set({ requiresElevator: true })
        .where(eq(schema.routes.id, parsed.data.defaultRouteId));
    }

    await this.emailService.sendVerificationCode(
      user.email,
      user.name,
      verificationCode,
    );

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role ?? 'STUDENT',
      municipalityId: user.municipalityId,
      tokenVersion: user.tokenVersion,
    };

    const accessToken = this.jwt.sign(payload, {
      expiresIn: '7d',
    });

    return { accessToken };
  }

  async login(dto: LoginDto) {
    const parsed = loginSchema.safeParse(dto);
    if (!parsed.success) {
      console.log('[AuthService] Login DTO failed validation:', parsed.error);
      throw new UnauthorizedException('Invalid credentials');
    }

    const { email, password } = parsed.data;

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
      .where(eq(schema.users.email, email));

    if (!data?.user) {
      console.log('[AuthService] User not found for email:', email);
      throw new UnauthorizedException('Invalid credentials');
    }

    const u = data.user;
    if (data.municipality?.active === false) {
      console.log('[AuthService] Municipality inactive for user:', u.id);
      throw new UnauthorizedException(
        'Municipality paused. Contact administrator.',
      );
    }

    const valid = await bcrypt.compare(password, u.passwordHash);
    if (!valid) {
      console.log('[AuthService] Password mismatch for user:', u.id);
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: u.id,
      email: u.email,
      role: u.role ?? 'STUDENT',
      municipalityId: u.municipalityId,
      tokenVersion: u.tokenVersion,
    };

    const accessToken = this.jwt.sign(payload, {
      expiresIn: '7d',
    });

    return { accessToken, user: mapUserToDto(u) };
  }

  async sendPasswordResetEmail(email: string): Promise<{ message: string }> {
    const [user] = await this.db
      .select({
        id: schema.users.id,
        email: schema.users.email,
      })
      .from(schema.users)
      .where(eq(schema.users.email, email));

    if (!user) {
      return { message: 'Password reset email sent' };
    }

    const token = randomBytes(32).toString('hex'); // 64 chars
    const redisKey = `${PASSWORD_RESET_PREFIX}${token}`;
    await this.redis.setex(redisKey, PASSWORD_RESET_TTL, user.id);

    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const resetUrl = `${frontendUrl}/user/reset-password?token=${token}`;

    await this.emailService.sendPasswordResetEmail(user.email, resetUrl);

    return { message: 'Password reset email sent' };
  }

  async getPasswordResetEmailPreview(userEmail: string): Promise<string> {
    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const token = 'x'.repeat(64);
    const resetUrl = `${frontendUrl}/user/reset-password?token=${token}`;
    const html = this.emailService.getPasswordResetEmailHtml(resetUrl);

    // Send to SMTP if configured (for development preview in Mailpit)
    await this.emailService.sendPasswordResetEmail(userEmail, resetUrl);

    return html;
  }

  async getVerificationEmailPreview(
    userEmail: string,
    userName: string,
  ): Promise<string> {
    const code = '123456';
    const html = this.emailService.getVerificationEmailHtml(userName, code);

    // Send to SMTP if configured
    await this.emailService.sendVerificationCode(userEmail, userName, code);

    return html;
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

  async sendVerificationCode(dto: {
    identifier: string;
    channel: 'EMAIL' | 'WHATSAPP';
    context: 'CHANGE_EMAIL' | 'RESET_PASSWORD' | 'REGISTER';
  }): Promise<{ message: string }> {
    const code = randomInt(100000, 1000000).toString();
    const redisKey = `verification-code:${dto.context}:${dto.channel}:${dto.identifier}`;

    // Save code in Redis for 10 minutes
    await this.redis.setex(redisKey, 600, code);

    if (dto.channel === 'EMAIL') {
      // Find user to get their name, fallback to "Usuário"
      const [user] = await this.db
        .select({ name: schema.users.name })
        .from(schema.users)
        .where(eq(schema.users.email, dto.identifier));

      const userName = user?.name || 'Usuário';
      await this.emailService.sendVerificationCode(dto.identifier, userName, code);
    } else {
      // WHATSAPP channel: log to console for simulator/dev preview
      console.log(`[WhatsAppService] Verification code for ${dto.identifier} via WHATSAPP: ${code}`);
    }

    return { message: 'Código enviado com sucesso!' };
  }

  async verifyCode(dto: {
    identifier: string;
    code: string;
    channel: 'EMAIL' | 'WHATSAPP';
    context: 'CHANGE_EMAIL' | 'RESET_PASSWORD' | 'REGISTER';
  }): Promise<{ verified: boolean; token?: string; message?: string }> {
    const redisKey = `verification-code:${dto.context}:${dto.channel}:${dto.identifier}`;
    const attemptsKey = `verification-attempts:${dto.context}:${dto.channel}:${dto.identifier}`;
    const storedCode = await this.redis.get(redisKey);

    if (!storedCode) {
      return {
        verified: false,
        message: 'Código inválido ou expirado',
      };
    }

    const attempts = await this.redis.incr(attemptsKey);
    if (attempts === 1) {
      await this.redis.expire(attemptsKey, 600); // 10 min TTL
    }

    if (attempts > 5) {
      await this.redis.del(redisKey);
      await this.redis.del(attemptsKey);
      return {
        verified: false,
        message: 'Número de tentativas excedido. Solicite um novo código.',
      };
    }

    if (storedCode !== dto.code) {
      if (attempts >= 5) {
        await this.redis.del(redisKey);
        await this.redis.del(attemptsKey);
        return {
          verified: false,
          message: 'Número de tentativas excedido. Solicite um novo código.',
        };
      }
      return {
        verified: false,
        message: 'Código inválido ou expirado',
      };
    }

    // Delete the verified code and attempts from Redis
    await this.redis.del(redisKey);
    await this.redis.del(attemptsKey);

    if (dto.context === 'RESET_PASSWORD') {
      // Find the user to associate with the reset token
      const [user] = await this.db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(
          dto.channel === 'EMAIL'
            ? eq(schema.users.email, dto.identifier)
            : eq(schema.users.phone, dto.identifier),
        );

      if (!user) {
        return {
          verified: false,
          message: 'Usuário não encontrado para o identificador fornecido',
        };
      }

      const token = randomBytes(32).toString('hex');
      const resetRedisKey = `${PASSWORD_RESET_PREFIX}${token}`;
      await this.redis.setex(resetRedisKey, PASSWORD_RESET_TTL, user.id);

      return {
        verified: true,
        token,
      };
    }

    return {
      verified: true,
    };
  }
}
