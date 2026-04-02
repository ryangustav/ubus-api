import { RolesGuard } from './roles.guard';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const mockContext = (role?: string): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: role ? { role } : undefined,
        }),
      }),
    } as any;
  };

  it('should allow access if no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(mockContext())).toBe(true);
  });

  it('should deny access if no user role exists', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['GESTOR']);
    expect(guard.canActivate(mockContext())).toBe(false);
  });

  it('should deny access if user role is not in required roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['GESTOR']);
    expect(guard.canActivate(mockContext('ALUNO'))).toBe(false);
  });

  it('should allow access if user role matches required roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['GESTOR', 'MOTORISTA']);
    expect(guard.canActivate(mockContext('GESTOR'))).toBe(true);
  });
});
