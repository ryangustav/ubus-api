import { Test, TestingModule } from '@nestjs/testing';
import { FleetService } from './fleet.service';
import { DRIZZLE } from '../../../shared/database/database.module';
import { mockDrizzle } from '../../../../test/helpers/drizzle-mock';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

describe('FleetService', () => {
  let service: FleetService;
  let db: typeof mockDrizzle;

  beforeEach(async () => {
    mockDrizzle.reset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [FleetService, { provide: DRIZZLE, useValue: mockDrizzle }],
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
        returning: jest
          .fn()
          .mockResolvedValue([{ id: 'route1', name: 'New name' }]),
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
    it('should create a new bus without layout', async () => {
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
      expect(result.routeId).toBeNull();
    });

    it('should create a new bus with layout', async () => {
      const layoutDto = {
        numberingMode: 'PHYSICAL',
        numerationSide: 'LEFT',
        dpmSeatVirtualNumber: 2,
        preferentialSeats: [2],
        rows: [
          {
            cells: [
              { col: 1, type: 'SEAT', virtualNumber: 1, physicalNumber: 1, position: 'WINDOW_LEFT', isDpm: false },
              { col: 2, type: 'SEAT', virtualNumber: 2, physicalNumber: 2, position: 'AISLE_LEFT', isDpm: true },
              { col: 3, type: 'AISLE', virtualNumber: null, physicalNumber: null, position: null, isDpm: false },
              { col: 4, type: 'SEAT', virtualNumber: 3, physicalNumber: 3, position: 'AISLE_RIGHT', isDpm: false },
              { col: 5, type: 'SEAT', virtualNumber: 4, physicalNumber: 4, position: 'WINDOW_RIGHT', isDpm: false },
            ]
          }
        ]
      };
      const dto = {
        identificationNumber: '123',
        plate: 'ABC',
        standardCapacity: 4,
        seatLayout: layoutDto
      };

      const insertChainBus = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ id: 'bus1', ...dto }]),
      };
      const insertChainLayout = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ busId: 'bus1' }]),
      };

      db.insert
        .mockReturnValueOnce(insertChainBus as any)
        .mockReturnValueOnce(insertChainLayout as any);

      const result = await service.createBus('mun1', dto, 'driver1');
      expect(result.id).toBe('bus1');
      expect(db.insert).toHaveBeenCalledTimes(2);
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

  describe('updateBusLayout', () => {
    const validLayout = {
      numberingMode: 'PHYSICAL',
      numerationSide: 'LEFT',
      dpmSeatVirtualNumber: 2,
      preferentialSeats: [2],
      rows: [
        {
          cells: [
            { col: 1, type: 'SEAT', virtualNumber: 1, physicalNumber: 1, position: 'WINDOW_LEFT', isDpm: false },
            { col: 2, type: 'SEAT', virtualNumber: 2, physicalNumber: 2, position: 'AISLE_LEFT', isDpm: true },
            { col: 3, type: 'AISLE', virtualNumber: null, physicalNumber: null, position: null, isDpm: false },
            { col: 4, type: 'SEAT', virtualNumber: 3, physicalNumber: 3, position: 'AISLE_RIGHT', isDpm: false },
            { col: 5, type: 'SEAT', virtualNumber: 4, physicalNumber: 4, position: 'WINDOW_RIGHT', isDpm: false },
          ]
        }
      ]
    };

    it('should throw NotFoundException if bus does not exist', async () => {
      const selectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      };
      db.select.mockReturnValue(selectChain as any);

      await expect(
        service.updateBusLayout('bus1', { sub: 'driver1', role: 'DRIVER', municipalityId: 'mun1' }, validLayout),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if DRIVER does not own the bus', async () => {
      const selectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ id: 'bus1', driverId: 'anotherDriver', municipalityId: 'mun1', standardCapacity: 4 }]),
      };
      db.select.mockReturnValue(selectChain as any);

      await expect(
        service.updateBusLayout('bus1', { sub: 'driver1', role: 'DRIVER', municipalityId: 'mun1' }, validLayout),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if seat count does not match capacity', async () => {
      const selectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ id: 'bus1', driverId: 'driver1', municipalityId: 'mun1', standardCapacity: 50 }]), // standardCapacity 50 vs 4 in layout
      };
      db.select.mockReturnValue(selectChain as any);

      await expect(
        service.updateBusLayout('bus1', { sub: 'driver1', role: 'DRIVER', municipalityId: 'mun1' }, validLayout),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully update bus layout', async () => {
      const selectChainBus = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ id: 'bus1', driverId: 'driver1', municipalityId: 'mun1', standardCapacity: 4 }]),
      };
      const selectChainLayout = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ busId: 'bus1', ...validLayout, updatedAt: new Date() }]),
      };
      const updateChain = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      };
      const insertChain = {
        values: jest.fn().mockReturnThis(),
        onConflictDoUpdate: jest.fn().mockResolvedValue([]),
      };

      db.select
        .mockReturnValueOnce(selectChainBus as any)
        .mockReturnValueOnce(selectChainLayout as any);
      db.update.mockReturnValue(updateChain as any);
      db.insert.mockReturnValue(insertChain as any);

      const result = await service.updateBusLayout(
        'bus1',
        { sub: 'driver1', role: 'DRIVER', municipalityId: 'mun1' },
        validLayout
      );
      expect(result.busId).toBe('bus1');
    });
  });

  describe('getBusLayout', () => {
    it('should throw NotFoundException if bus not found', async () => {
      const selectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      };
      db.select.mockReturnValue(selectChain as any);

      await expect(
        service.getBusLayout('bus1', 'mun1', 'STUDENT'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if layout not found', async () => {
      const selectChainBus = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ id: 'bus1', municipalityId: 'mun1' }]),
      };
      const selectChainLayout = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      };

      db.select
        .mockReturnValueOnce(selectChainBus as any)
        .mockReturnValueOnce(selectChainLayout as any);

      await expect(
        service.getBusLayout('bus1', 'mun1', 'STUDENT'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
