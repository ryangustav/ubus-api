import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsService } from './reservations.service';
import { DRIZZLE } from '../../../shared/database/database.module';
import { mockDrizzle } from '../../../../test/helpers/drizzle-mock';
import { NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let db: typeof mockDrizzle;

  beforeEach(async () => {
    mockDrizzle.reset();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        {
          provide: DRIZZLE,
          useValue: mockDrizzle,
        },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
    db = module.get(DRIZZLE);
  });

  describe('create', () => {
    it('should throw NotFoundException if trip is not found', async () => {
      // Mock db.select().from().where() to return empty array
      const mockChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([])
      };
      db.select.mockReturnValue(mockChain as any);

      await expect(
        service.create({ idViagem: 'invalid', idUsuario: 'user1', numeroAssento: 1 })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException on UNIQUE constraint violation', async () => {
      // Mock finding the trip first
      const mockTrip = [{ idViagem: 'trip1', capacidadeReal: 40 }];
      
      const mockWhere = jest.fn().mockResolvedValue(mockTrip); // use generic mockResolvedValue
        
      const mockChain = {
        from: jest.fn().mockReturnThis(),
        where: mockWhere
      };
      db.select.mockReturnValue(mockChain as any);
      
      // Setup the insert to throw Postgres 23505
      const pgError = new Error('duplicate key value violates unique constraint');
      (pgError as any).code = '23505';
      
      const insertChain = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockRejectedValue(pgError)
      };
      db.insert.mockReturnValue(insertChain as any);

      await expect(
        service.create({ idViagem: 'trip1', idUsuario: 'user1', numeroAssento: 1 })
      ).rejects.toThrow(ConflictException);
    });

    it('should fail to create excess reservation if capacity is not full', async () => {
      // Trip exists
      const mockTrip = [{ idViagem: 'trip1', capacidadeReal: 40 }];
      
      // Return trip then return occupied seats (39)
      const mockWhere = jest.fn()
        .mockResolvedValueOnce(mockTrip) // First call: find trip
        .mockResolvedValueOnce(Array(39).fill({ numeroAssento: 1 })); // Second call: getAssentosOcupados
        
      const mockChain = {
        from: jest.fn().mockReturnThis(),
        where: mockWhere
      };
      db.select.mockReturnValue(mockChain as any);

      // null seat number indicates excess
      await expect(
        service.create({ idViagem: 'trip1', idUsuario: 'user1', numeroAssento: null })
      ).rejects.toThrow(BadRequestException);
    });

    it('should create excess reservation if capacity is full', async () => {
      const mockTrip = [{ idViagem: 'trip1', capacidadeReal: 40 }];
      
      const mockWhere = jest.fn()
        .mockResolvedValueOnce(mockTrip) 
        .mockResolvedValueOnce(Array(40).fill({ numeroAssento: 1 })); 
        
      const mockChain = {
        from: jest.fn().mockReturnThis(),
        where: mockWhere
      };
      db.select.mockReturnValue(mockChain as any);

      const mockReserva = { id: 'reserva1', status: 'EXCESSO' };
      const insertChain = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockReserva])
      };
      db.insert.mockReturnValue(insertChain as any);

      const result = await service.create({ idViagem: 'trip1', idUsuario: 'user1', numeroAssento: null });
      expect(result).toEqual(mockReserva);
      
      expect(insertChain.values).toHaveBeenCalledWith(expect.objectContaining({
        status: 'EXCESSO'
      }));
    });
  });

  describe('update', () => {
    it('should throw ForbiddenException if user tries to update another users reservation', async () => {
      const mockReserva = [{ id: 'res1', idUsuario: 'user_a' }];
      const mockWhere = jest.fn().mockResolvedValue(mockReserva);
      const mockChain = {
        from: jest.fn().mockReturnThis(),
        where: mockWhere
      };
      db.select.mockReturnValue(mockChain as any);

      await expect(
        service.update('res1', { numeroAssento: 2 }, 'user_b')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update successfully if owner', async () => {
      const mockReserva = [{ id: 'res1', idUsuario: 'user_a' }];
      const mockWhere = jest.fn().mockResolvedValue(mockReserva);
      const mockChain = {
        from: jest.fn().mockReturnThis(),
        where: mockWhere
      };
      db.select.mockReturnValue(mockChain as any);

      const updateChain = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ id: 'res1', numeroAssento: 2 }])
      };
      db.update.mockReturnValue(updateChain as any);

      const result = await service.update('res1', { numeroAssento: 2 }, 'user_a');
      expect(result).toBeDefined();
      expect(updateChain.set).toHaveBeenCalledWith(expect.objectContaining({ numeroAssento: 2 }));
    });
  });

  describe('remove', () => {
    it('should throw ForbiddenException if user tries to cancel another users reservation', async () => {
      const mockReserva = [{ id: 'res1', idUsuario: 'user_a' }];
      const mockWhere = jest.fn().mockResolvedValue(mockReserva);
      const mockChain = {
        from: jest.fn().mockReturnThis(),
        where: mockWhere
      };
      db.select.mockReturnValue(mockChain as any);

      await expect(
        service.remove('res1', 'user_b')
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
