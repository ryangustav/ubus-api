import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsService } from './reservations.service';
import { DRIZZLE } from '../../../shared/database/database.module';
import { mockDrizzle } from '../../../../test/helpers/drizzle-mock';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

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
    it('should throw NotFoundException if user is not found', async () => {
      const mockChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      };
      db.select.mockReturnValue(mockChain as any);

      await expect(
        service.create({ tripId: 'trip1', userId: 'invalid', seatNumber: 1 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is SUSPENDED', async () => {
      const mockUser = [
        {
          id: 'user1',
          registrationStatus: 'SUSPENDED',
          needsWheelchair: false,
        },
      ];
      const mockChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(mockUser),
      };
      db.select.mockReturnValue(mockChain as any);

      await expect(
        service.create({ tripId: 'trip1', userId: 'user1', seatNumber: 1 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if trip is not found', async () => {
      const mockUser = [
        { id: 'user1', registrationStatus: 'APPROVED', needsWheelchair: false },
      ];

      const mockWhere = jest
        .fn()
        .mockResolvedValueOnce(mockUser) // user
        .mockResolvedValueOnce([]); // trip

      const mockChain = {
        from: jest.fn().mockReturnThis(),
        where: mockWhere,
      };
      db.select.mockReturnValue(mockChain as any);

      await expect(
        service.create({ tripId: 'invalid', userId: 'user1', seatNumber: 1 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException on UNIQUE constraint violation', async () => {
      const mockUser = [
        { id: 'user1', registrationStatus: 'APPROVED', needsWheelchair: false },
      ];
      const mockTrip = [{ id: 'trip1', actualCapacity: 40 }];

      const mockWhere = jest
        .fn()
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockTrip);

      const mockChain = {
        from: jest.fn().mockReturnThis(),
        where: mockWhere,
      };
      db.select.mockReturnValue(mockChain as any);

      const pgError = new Error(
        'duplicate key value violates unique constraint',
      );
      (pgError as any).code = '23505';

      const insertChain = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockRejectedValue(pgError),
      };
      db.insert.mockReturnValue(insertChain as any);

      await expect(
        service.create({ tripId: 'trip1', userId: 'user1', seatNumber: 1 }),
      ).rejects.toThrow(ConflictException);
    });

    it('should fail to create excess reservation if capacity is not full', async () => {
      const mockUser = [
        { id: 'user1', registrationStatus: 'APPROVED', needsWheelchair: false },
      ];
      const mockTrip = [{ id: 'trip1', actualCapacity: 40 }];

      const mockWhere = jest
        .fn()
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockTrip)
        .mockResolvedValueOnce(Array(39).fill({ seatNumber: 1 })); // getOccupiedSeats

      const mockChain = {
        from: jest.fn().mockReturnThis(),
        where: mockWhere,
      };
      db.select.mockReturnValue(mockChain as any);

      await expect(
        service.create({ tripId: 'trip1', userId: 'user1', seatNumber: null }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create excess reservation if capacity is full', async () => {
      const mockUser = [
        { id: 'user1', registrationStatus: 'APPROVED', needsWheelchair: false },
      ];
      const mockTrip = [{ id: 'trip1', actualCapacity: 40 }];

      const mockWhere = jest
        .fn()
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockTrip)
        .mockResolvedValueOnce(Array(40).fill({ seatNumber: 1 }));

      const mockChain = {
        from: jest.fn().mockReturnThis(),
        where: mockWhere,
      };
      db.select.mockReturnValue(mockChain as any);

      const mockReservation = { id: 'reservation1', status: 'EXCESS' };
      const insertChain = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockReservation]),
      };
      db.insert.mockReturnValue(insertChain as any);

      const result = await service.create({
        tripId: 'trip1',
        userId: 'user1',
        seatNumber: null,
      });
      expect(result).toEqual(mockReservation);

      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'EXCESS',
        }),
      );
    });
  });

  describe('update', () => {
    it('should throw ForbiddenException if user tries to update another users reservation', async () => {
      const mockReservation = [{ id: 'res1', userId: 'user_a' }];
      const mockWhere = jest.fn().mockResolvedValue(mockReservation);
      const mockChain = {
        from: jest.fn().mockReturnThis(),
        where: mockWhere,
      };
      db.select.mockReturnValue(mockChain as any);

      await expect(
        service.update('res1', { seatNumber: 2 }, 'user_b'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update successfully if owner', async () => {
      const mockReservation = [{ id: 'res1', userId: 'user_a' }];
      const mockWhere = jest.fn().mockResolvedValue(mockReservation);
      const mockChain = {
        from: jest.fn().mockReturnThis(),
        where: mockWhere,
      };
      db.select.mockReturnValue(mockChain as any);

      const updateChain = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ id: 'res1', seatNumber: 2 }]),
      };
      db.update.mockReturnValue(updateChain as any);

      const result = await service.update('res1', { seatNumber: 2 }, 'user_a');
      expect(result).toBeDefined();
      expect(updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({ seatNumber: 2 }),
      );
    });
  });

  describe('remove', () => {
    it('should throw ForbiddenException if user tries to cancel another users reservation', async () => {
      const mockReservation = [{ id: 'res1', userId: 'user_a' }];
      const mockWhere = jest.fn().mockResolvedValue(mockReservation);
      const mockChain = {
        from: jest.fn().mockReturnThis(),
        where: mockWhere,
      };
      db.select.mockReturnValue(mockChain as any);

      await expect(service.remove('res1', 'user_b')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
