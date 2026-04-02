import { Test, TestingModule } from '@nestjs/testing';
import { ManagementService } from './management.service';
import { DRIZZLE } from '../../../shared/database/database.module';
import { mockDrizzle } from '../../../../test/helpers/drizzle-mock';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
}));

describe('ManagementService', () => {
  let service: ManagementService;
  let db: typeof mockDrizzle;

  const SYSTEM_ID = '00000000-0000-0000-0000-000000000001';

  beforeEach(async () => {
    mockDrizzle.reset();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ManagementService,
        { provide: DRIZZLE, useValue: mockDrizzle },
      ],
    }).compile();

    service = module.get<ManagementService>(ManagementService);
    db = module.get(DRIZZLE);
  });

  describe('create', () => {
    it('should create a municipality', async () => {
      const insertChain = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ id: 'mun1', name: 'New City' }]),
      };
      db.insert.mockReturnValue(insertChain as any);

      const result = await service.create({ name: 'New City' });
      expect(result.id).toBe('mun1');
      expect(insertChain.values).toHaveBeenCalledWith({ name: 'New City' });
    });
  });

  describe('update', () => {
    it('should throw ConflictException if trying to modify SYSTEM municipality', async () => {
      await expect(
        service.update(SYSTEM_ID, { active: false }),
      ).rejects.toThrow(ConflictException);
    });

    it('should update successfully', async () => {
      const updateChain = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ id: 'mun1', active: false }]),
      };
      db.update.mockReturnValue(updateChain as any);

      const result = await service.update('mun1', { active: false });
      expect(result.active).toBe(false);
      expect(updateChain.set).toHaveBeenCalledWith({ active: false });
    });
  });

  describe('createManager', () => {
    const dto = {
      municipalityId: 'mun1',
      cpf: '12345678901',
      name: 'Manager',
      email: 'm@a.com',
      password: 'pass',
    };

    it('should throw ConflictException if SYSTEM municipality', async () => {
      await expect(
        service.createManager({ ...dto, municipalityId: SYSTEM_ID }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if municipality not found', async () => {
      const mockChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      };
      db.select.mockReturnValue(mockChain as any);

      await expect(service.createManager(dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if municipality already has manager', async () => {
      const mockChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ id: 'mun1', managerId: 'g1' }]),
      };
      db.select.mockReturnValue(mockChain as any);

      await expect(service.createManager(dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create manager successfully', async () => {
      const mockWhere = jest.fn()
        .mockResolvedValueOnce([{ id: 'mun1' }]) // found municipality
        .mockResolvedValueOnce([]) // existing email
        .mockResolvedValueOnce([]); // existing cpf

      const mockChain = {
        from: jest.fn().mockReturnThis(),
        where: mockWhere,
      };
      db.select.mockReturnValue(mockChain as any);

      const insertChain = {
        values: jest.fn().mockReturnThis(),
        returning: jest
          .fn()
          .mockResolvedValue([{ id: 'user1', email: 'm@a.com' }]),
      };
      db.insert.mockReturnValue(insertChain as any);

      const updateChain = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest
          .fn()
          .mockResolvedValue([{ id: 'mun1', managerId: 'user1' }]),
      };
      db.update.mockReturnValue(updateChain as any);

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

      const result = await service.createManager(dto);
      expect(result.id).toBe('user1');
      expect(insertChain.values).toHaveBeenCalled();
      expect(updateChain.set).toHaveBeenCalledWith({ managerId: 'user1' });
    });
  });
});
