import { Test, TestingModule } from '@nestjs/testing';
import { TripsService } from './trips.service';
import { DRIZZLE } from '../../../shared/database/database.module';
import { getRedisConnectionToken } from '@nestjs-modules/ioredis';
import { mockDrizzle } from '../../../../test/helpers/drizzle-mock';
import { mockRedis } from '../../../../test/helpers/redis-mock';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('TripsService', () => {
  let service: TripsService;
  let db: typeof mockDrizzle;
  let redis: typeof mockRedis;

  beforeEach(async () => {
    mockDrizzle.reset();
    mockRedis.reset();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripsService,
        { provide: DRIZZLE, useValue: mockDrizzle },
        { provide: getRedisConnectionToken('default'), useValue: mockRedis },
      ],
    }).compile();

    service = module.get<TripsService>(TripsService);
    db = module.get(DRIZZLE);
    redis = module.get(getRedisConnectionToken('default'));
  });

  describe('triggerConfirmationAlert', () => {
    it('should throw NotFoundException if trip not found', async () => {
      const mockChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      };
      db.select.mockReturnValue(mockChain as any);

      await expect(
        service.triggerConfirmationAlert('trip1', 'user1', 'mun1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if trip belongs to another municipality', async () => {
      const mockWhere = jest.fn()
        .mockResolvedValueOnce([
          { id: 'trip1', routeId: 'route1', leaderIds: [] },
        ])
        .mockResolvedValueOnce([null]) // driver target
        .mockResolvedValueOnce([{ id: 'route1', municipalityId: 'mun2' }]); // different municipality

      const mockChain = {
        from: jest.fn().mockReturnThis(),
        where: mockWhere,
      };
      db.select.mockReturnValue(mockChain as any);

      await expect(
        service.triggerConfirmationAlert('trip1', 'user1', 'mun1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should trigger alert successfully if user is leader', async () => {
      const mockWhere = jest.fn()
        .mockResolvedValueOnce([
          { id: 'trip1', routeId: 'route1', leaderIds: ['user1'] },
        ])
        .mockResolvedValueOnce([{ id: 'route1', municipalityId: 'mun1' }]);

      const mockChain = {
        from: jest.fn().mockReturnThis(),
        where: mockWhere,
      };
      db.select.mockReturnValue(mockChain as any);

      const result = await service.triggerConfirmationAlert(
        'trip1',
        'user1',
        'mun1',
      );
      expect(result.message).toBe('Confirmation alert triggered');
      expect(redis.setex).toHaveBeenCalled();
    });
  });

  describe('finishAndPunish', () => {
    it('should apply penalties to unconfirmed reservations', async () => {
      const mockWhere = jest.fn()
        .mockResolvedValueOnce([
          { id: 'trip1', routeId: 'route1', leaderIds: ['user1'] },
        ]) // trip
        .mockResolvedValueOnce([{ id: 'route1', municipalityId: 'mun1' }]) // route
        .mockResolvedValueOnce([
          { id: 'res1', status: 'CONFIRMED', userId: 'user2' },
        ]) // reservations
        .mockResolvedValueOnce([{ priorityLevel: 1 }]); // user priority

      const mockChain = {
        from: jest.fn().mockReturnThis(),
        where: mockWhere,
      };
      db.select.mockReturnValue(mockChain as any);

      const updateChain = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(true),
      };
      db.update.mockReturnValue(updateChain as any);

      const result = await service.finishAndPunish('trip1', 'user1', 'mun1');
      expect(result.message).toBeDefined();
      expect(db.update).toHaveBeenCalled();
    });
  });

  describe('relocation', () => {
    it('should reallocate passengers to destination trip', async () => {
      const mockWhere = jest.fn()
        .mockResolvedValueOnce([
          { id: 'trip1', routeId: 'route1', leaderIds: ['user1'] },
        ]) // origin
        .mockResolvedValueOnce([{ id: 'trip2', routeId: 'route1' }]) // destination
        .mockResolvedValueOnce([{ id: 'route1', municipalityId: 'mun1' }]) // route
        .mockResolvedValueOnce([
          { id: 'res1', tripId: 'trip1', seatNumber: 1 },
        ]) // reservations
        .mockResolvedValueOnce([{ seatNumber: 1 }]); // destination occupied (so seat 1 is occupied)

      const mockChain = {
        from: jest.fn().mockReturnThis(),
        where: mockWhere,
      };
      db.select.mockReturnValue(mockChain as any);

      const updateChain = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(true),
      };
      db.update.mockReturnValue(updateChain as any);

      await service.relocation('trip1', 'trip2', 'user1', 'mun1');

      // Since seat 1 was occupied in destination, user from origin should get seat 2
      expect(updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({
          seatNumber: 2,
          tripId: 'trip2',
        }),
      );
    });
  });
});
