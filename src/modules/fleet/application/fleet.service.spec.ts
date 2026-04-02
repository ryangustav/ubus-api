import { Test, TestingModule } from '@nestjs/testing';
import { FleetService } from './fleet.service';
import { DRIZZLE } from '../../../shared/database/database.module';
import { mockDrizzle } from '../../../../test/helpers/drizzle-mock';
import { NotFoundException } from '@nestjs/common';

describe('FleetService', () => {
  let service: FleetService;
  let db: typeof mockDrizzle;

  beforeEach(async () => {
    mockDrizzle.reset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FleetService,
        { provide: DRIZZLE, useValue: mockDrizzle },
      ],
    }).compile();

    service = module.get<FleetService>(FleetService);
    db = module.get(DRIZZLE);
  });

  describe('listRoutes', () => {
    it('should list routes by municipality id', async () => {
      const mockChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ id: 'route1' }]),
      };
      db.select.mockReturnValue(mockChain as any);

      const result = await service.listRoutes('mun1');
      expect(result).toEqual([{ id: 'route1' }]);
    });
  });

  describe('createRoute', () => {
    it('should create a new route', async () => {
      const dto = {
        name: 'Route 1',
        weekDays: [1, 2, 3],
        votingOpenTime: '06:00',
        votingCloseTime: '07:30',
      };

      const insertChain = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ id: 'route1', ...dto }]),
      };
      db.insert.mockReturnValue(insertChain as any);

      const result = await service.createRoute('mun1', dto);
      expect(result.id).toBe('route1');
      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Route 1' }),
      );
    });
  });

  describe('updateRoute', () => {
    it('should throw NotFoundException if route not found', async () => {
      const updateChain = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([]),
      };
      db.update.mockReturnValue(updateChain as any);

      await expect(
        service.updateRoute('mun1', 'route1', { name: 'New name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update successfully', async () => {
      const updateChain = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ id: 'route1', name: 'New name' }]),
      };
      db.update.mockReturnValue(updateChain as any);

      const result = await service.updateRoute('mun1', 'route1', {
        name: 'New name',
      });
      expect(result.name).toBe('New name');
      expect(updateChain.set).toHaveBeenCalledWith({ name: 'New name' });
    });
  });

  describe('createBus', () => {
    it('should create a new bus', async () => {
      const dto = {
        identificationNumber: '123',
        plate: 'ABC',
        standardCapacity: 40,
      };
      const insertChain = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ id: 'bus1', ...dto }]),
      };
      db.insert.mockReturnValue(insertChain as any);

      const result = await service.createBus('mun1', dto, 'driver1');
      expect(result.id).toBe('bus1');
    });
  });

  describe('updateBus', () => {
    it('should throw NotFoundException if bus not found', async () => {
      const updateChain = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([]),
      };
      db.update.mockReturnValue(updateChain as any);

      await expect(
        service.updateBus('mun1', 'bus1', { plate: 'XYZ' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
