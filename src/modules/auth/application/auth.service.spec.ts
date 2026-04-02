import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../../../shared/email/email.service';
import { DRIZZLE } from '../../../shared/database/database.module';
import { getRedisConnectionToken } from '@nestjs-modules/ioredis';
import { mockDrizzle } from '../../../../test/helpers/drizzle-mock';
import { mockRedis } from '../../../../test/helpers/redis-mock';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let db: typeof mockDrizzle;

  const mockJwtService = { sign: jest.fn().mockReturnValue('token') };
  const mockEmailService = {
    sendPasswordResetEmail: jest.fn(),
    getPasswordResetEmailHtml: jest.fn(),
  };
  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost'),
  };

  beforeEach(async () => {
    mockDrizzle.reset();
    mockRedis.reset();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DRIZZLE, useValue: mockDrizzle },
        { provide: getRedisConnectionToken('default'), useValue: mockRedis },
        { provide: JwtService, useValue: mockJwtService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    db = module.get(DRIZZLE);
  });

  describe('register', () => {
    const validDto = {
      municipalityId: '123e4567-e89b-12d3-a456-426614174000',
      cpf: '12345678901',
      name: 'Test',
      email: 'test@test.com',
      password: 'password123',
    };

    it('should throw ConflictException if municipality not found', async () => {
      const mockChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      };
      db.select.mockReturnValue(mockChain as any);

      await expect(service.register(validDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if email exists in municipality', async () => {
      const mockWhere = jest.fn()
        .mockResolvedValueOnce([{ id: 'mun1', active: true }]) // municipality
        .mockResolvedValueOnce([{ id: 'user1' }]) // email exists
        .mockResolvedValueOnce([]); // cpf check

      const mockChain = {
        from: jest.fn().mockReturnThis(),
        where: mockWhere,
      };
      db.select.mockReturnValue(mockChain as any);

      await expect(service.register(validDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should register successfully', async () => {
      const mockWhere = jest.fn()
        .mockResolvedValueOnce([{ id: 'mun1', active: true }]) // municipality
        .mockResolvedValueOnce([]) // email check
        .mockResolvedValueOnce([]); // cpf check

      const mockChain = {
        from: jest.fn().mockReturnThis(),
        where: mockWhere,
      };
      db.select.mockReturnValue(mockChain as any);

      const mockUser = {
        id: 'user1',
        email: validDto.email,
        passwordHash: 'hash',
      };
      const insertChain = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockUser]),
      };
      db.insert.mockReturnValue(insertChain as any);

      // We have to mock login as it's called internally
      jest.spyOn(service, 'login').mockResolvedValue('loginResult' as any);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

      const result = await service.register(validDto);
      expect(result).toBe('loginResult');
      expect(insertChain.values).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto = { email: 'a@a.com', password: 'password123' };

    it('should throw UnauthorizedException on invalid email', async () => {
      const mockChain = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      };
      db.select.mockReturnValue(mockChain as any);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if wrong password', async () => {
      const mockUser = [
        {
          user: {
            id: 'user1',
            passwordHash: 'hash',
            email: 'a@a.com',
            role: 'STUDENT',
            municipalityId: 'mun1',
          },
          municipality: { active: true },
        },
      ];
      const mockChain = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(mockUser),
      };
      db.select.mockReturnValue(mockChain as any);

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return token if valid', async () => {
      const mockUser = [
        {
          user: {
            id: 'user1',
            log: 'u1',
            passwordHash: 'hash',
            email: 'a@a.com',
            role: 'STUDENT',
            municipalityId: 'mun1',
          },
          municipality: { active: true },
        },
      ];
      const mockChain = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(mockUser),
      };
      db.select.mockReturnValue(mockChain as any);

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(loginDto);
      expect(result.accessToken).toBe('token');
      expect(result.user).toBeDefined();
    });
  });
});
