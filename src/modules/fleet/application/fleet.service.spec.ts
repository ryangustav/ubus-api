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

  describe('listLinhas', () => {
    it('should list lines by prefeitura id', async () => {
      const mockChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ id: 'linha1' }])
      };
      db.select.mockReturnValue(mockChain as any);

      const result = await service.listLinhas('mun1');
      expect(result).toEqual([{ id: 'linha1' }]);
    });
  });

  describe('createLinha', () => {
    it('should create a new route', async () => {
      const dto = {
        nome: 'Route 1',
        diasDaSemana: [1,2,3],
        horarioAberturaVotacao: '06:00',
        horarioFechamentoVotacao: '07:30'
      };
      
      const insertChain = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ id: 'linha1', ...dto }])
      };
      db.insert.mockReturnValue(insertChain as any);

      const result = await service.createLinha('mun1', dto);
      expect(result.id).toBe('linha1');
      expect(insertChain.values).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Route 1' }));
    });
  });

  describe('updateLinha', () => {
    it('should throw NotFoundException if route not found', async () => {
      const updateChain = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([])
      };
      db.update.mockReturnValue(updateChain as any);

      await expect(
        service.updateLinha('mun1', 'linha1', { nome: 'New name' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should update successfully', async () => {
      const updateChain = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ id: 'linha1', nome: 'New name' }])
      };
      db.update.mockReturnValue(updateChain as any);

      const result = await service.updateLinha('mun1', 'linha1', { nome: 'New name' });
      expect(result.nome).toBe('New name');
      expect(updateChain.set).toHaveBeenCalledWith({ nome: 'New name' });
    });
  });

  describe('createOnibus', () => {
    it('should create a new bus', async () => {
      const dto = {
        numeroIdentificacao: '123',
        placa: 'ABC',
        capacidadePadrao: 40
      };
      const insertChain = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ id: 'bus1', ...dto }])
      };
      db.insert.mockReturnValue(insertChain as any);

      const result = await service.createOnibus('mun1', dto, 'motorista1');
      expect(result.id).toBe('bus1');
    });
  });

  describe('updateOnibus', () => {
    it('should throw NotFoundException if bus not found', async () => {
        const updateChain = {
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([])
        };
        db.update.mockReturnValue(updateChain as any);
  
        await expect(
          service.updateOnibus('mun1', 'bus1', { placa: 'XYZ' })
        ).rejects.toThrow(NotFoundException);
      });
  });
});
