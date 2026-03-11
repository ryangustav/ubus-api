import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InjectRedis } from '@nestjs-modules/ioredis';
import type Redis from 'ioredis';
import {
  Usuario,
  UsuarioDocument,
} from '../../../shared/database/schema/user.schema';
import {
  Prefeitura,
  PrefeituraDocument,
} from '../../../shared/database/schema/prefeitura.schema';
import * as bcrypt from 'bcrypt';
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
    @InjectModel(Usuario.name) private userModel: Model<UsuarioDocument>,
    @InjectModel(Prefeitura.name)
    private prefeituraModel: Model<PrefeituraDocument>,
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

    const cpfNorm = normalizeCpf(parsed.data.cpf);
    const { municipalityId } = parsed.data;

    const prefeitura = await this.prefeituraModel
      .findById(municipalityId)
      .exec();
    if (!prefeitura) throw new ConflictException('Municipality not found');
    if (prefeitura.ativo === false) {
      throw new ConflictException('Registrations paused for this municipality');
    }

    const existingEmail = await this.userModel
      .findOne({
        email: parsed.data.email,
        idPrefeitura: municipalityId,
      })
      .exec();

    const existingCpf = await this.userModel
      .findOne({
        cpf: cpfNorm,
        idPrefeitura: municipalityId,
      })
      .exec();

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

    if (parsed.data.role === 'GESTOR') {
      if (prefeitura.idGestor) {
        throw new ConflictException('Municipality already has a manager');
      }
    }

    const hash = await bcrypt.hash(parsed.data.password, 10);
    const user = new this.userModel({
      idPrefeitura: municipalityId,
      cpf: cpfNorm,
      nome: parsed.data.name,
      email: parsed.data.email,
      senhaHash: hash,
      telefone: parsed.data.phone,
      role: parsed.data.role,
      nivelPrioridade: parsed.data.priorityLevel,
      idLinhaPadrao: parsed.data.defaultRouteId ?? undefined, // Using undefined instead of null to omit if not present
    });

    await user.save();

    if (parsed.data.role === 'GESTOR') {
      prefeitura.idGestor = user.id;
      await prefeitura.save();
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

    const user = await this.userModel
      .findOne({ email: parsed.data.email })
      .exec();
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const prefeitura = await this.prefeituraModel
      .findById(user.idPrefeitura)
      .exec();
    if (prefeitura && prefeitura.ativo === false) {
      throw new UnauthorizedException(
        'Municipality paused. Contact administrator.',
      );
    }

    const valid = await bcrypt.compare(parsed.data.password, user.senhaHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: (user.role as JwtPayload['role']) ?? 'ALUNO',
      municipalityId: user.idPrefeitura,
    };

    const accessToken = this.jwt.sign(payload, {
      expiresIn: '7d',
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.nome,
        role: user.role,
        municipalityId: user.idPrefeitura,
        priorityLevel: user.nivelPrioridade,
      },
    };
  }

  async sendPasswordResetEmail(userId: string): Promise<{ message: string }> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new UnauthorizedException('User not found');

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

  getPasswordResetEmailPreview(): string {
    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
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
    await this.userModel.findByIdAndUpdate(userId, { senhaHash: hash }).exec();
    await this.redis.del(redisKey);

    return { message: 'Password reset successfully' };
  }
}
