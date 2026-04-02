import { Test, TestingModule } from '@nestjs/testing';
import { BusLeaderGuard } from './bus-leader.guard';
import { DRIZZLE } from '../database/database.module';
import { mockDrizzle } from '../../../test/helpers/drizzle-mock';
import { ExecutionContext } from '@nestjs/common';

describe('BusLeaderGuard', () => {
  let guard: BusLeaderGuard;
  let db: typeof mockDrizzle;

  beforeEach(async () => {
    mockDrizzle.reset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusLeaderGuard,
        { provide: DRIZZLE, useValue: mockDrizzle },
      ],
    }).compile();

    guard = module.get<BusLeaderGuard>(BusLeaderGuard);
    db = module.get(DRIZZLE);
  });

  const mockContext = (user?: any, params?: any): ExecutionContext => {
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user, params }),
      }),
    } as any;
  };

  it('should deny if no user or municipalityId', async () => {
    expect(await guard.canActivate(mockContext())).toBe(false);
    expect(await guard.canActivate(mockContext({ sub: 'user1' }))).toBe(false);
  });

  it('should allow if role is MANAGER or DRIVER', async () => {
    expect(
      await guard.canActivate(
        mockContext({ sub: 'user1', municipalityId: 'mun1', role: 'MANAGER' }),
      ),
    ).toBe(true);
    expect(
      await guard.canActivate(
        mockContext({ sub: 'user1', municipalityId: 'mun1', role: 'DRIVER' }),
      ),
    ).toBe(true);
  });

  it('should deny if no params id (bus id)', async () => {
    expect(
      await guard.canActivate(
        mockContext({ sub: 'user1', municipalityId: 'mun1', role: 'LEADER' }),
      ),
    ).toBe(false);
  });

  it('should deny if bus not found or different municipality', async () => {
    const mockWhere = jest.fn()
      .mockResolvedValueOnce([]) // No bus
      .mockResolvedValueOnce([{ municipalityId: 'mun2' }]); // Diff municipality

    const mockChain = {
      from: jest.fn().mockReturnThis(),
      where: mockWhere,
    };
    db.select.mockReturnValue(mockChain as any);

    // Call 1: No bus
    expect(
      await guard.canActivate(
        mockContext(
          { sub: 'user1', municipalityId: 'mun1', role: 'LEADER' },
          { id: 'bus1' },
        ),
      ),
    ).toBe(false);

    // Call 2: Diff mun
    expect(
      await guard.canActivate(
        mockContext(
          { sub: 'user1', municipalityId: 'mun1', role: 'LEADER' },
          { id: 'bus1' },
        ),
      ),
    ).toBe(false);
  });

  it('should deny if user is not a leader of any trip using this bus', async () => {
    const mockWhere = jest.fn()
      .mockResolvedValueOnce([{ municipalityId: 'mun1' }]) // Bus found
      .mockResolvedValueOnce([{ leaderIds: ['user2'] }]); // Trip data

    const mockChain = {
      from: jest.fn().mockReturnThis(),
      where: mockWhere,
    };
    db.select.mockReturnValue(mockChain as any);

    expect(
      await guard.canActivate(
        mockContext(
          { sub: 'user1', municipalityId: 'mun1', role: 'LEADER' },
          { id: 'bus1' },
        ),
      ),
    ).toBe(false);
  });

  it('should allow if user is a leader of a trip using this bus', async () => {
    const mockWhere = jest.fn()
      .mockResolvedValueOnce([{ municipalityId: 'mun1' }]) // Bus found
      .mockResolvedValueOnce([{ leaderIds: ['user1', 'user2'] }]); // Trip data

    const mockChain = {
      from: jest.fn().mockReturnThis(),
      where: mockWhere,
    };
    db.select.mockReturnValue(mockChain as any);

    expect(
      await guard.canActivate(
        mockContext(
          { sub: 'user1', municipalityId: 'mun1', role: 'LEADER' },
          { id: 'bus1' },
        ),
      ),
    ).toBe(true);
  });
});
