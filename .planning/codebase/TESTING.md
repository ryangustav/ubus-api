# Testing Patterns

**Analysis Date:** 2026-03-30

## Test Framework

**Runner:**
- Jest ^30.0.0 (and `ts-jest`)
- Config: `package.json` contains `jest` config or implicitly uses defaults with `test/jest-e2e.json` for E2E.

**Assertion Library:**
- Built-in Jest `expect`.
- Matchers: `toBe`, `toEqual`, `toMatchObject`, `toThrow`.

**Run Commands:**
```bash
npm test                              # Run all tests
npm run test:watch                    # Watch mode for development
npm run test:cov                      # Generate coverage report
npm run test:e2e                      # Run end-to-end tests
```

## Test File Organization

**Location:**
- Unit tests: No extensive unit tests found yet in the root, but NestJS default is `*.spec.ts` alongside source files.
- E2E tests: Located in the `test/` directory.

**Naming:**
- `*.spec.ts`: Modern NestJS convention for unit tests.
- `*.e2e-spec.ts`: For end-to-end integration tests.

**Structure:**
```
src/
  modules/
    auth/
      auth.service.ts
      auth.service.spec.ts (expected pattern)
test/
  app.e2e-spec.ts
  jest-e2e.json
```

## Test Structure

**Suite Organization:**
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MyService } from './my.service';

describe('MyService', () => {
  let service: MyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MyService],
    }).compile();

    service = module.get<MyService>(MyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

**Patterns:**
- Use `beforeEach` to initialize the `TestingModule`.
- One `describe` block per class/service, nested `describe` per method.
- Arrange/Act/Assert (implicit or explicit comments).

## Mocking

**Framework:**
- Jest built-in mocking (`jest.fn()`, `jest.spyOn()`).

**What to Mock:**
- External services (Email, OCI Vault).
- Database connections (when doing unit tests).
- Redis and BullMQ clients.

## Coverage

**Requirements:**
- No strictly enforced coverage target found in `package.json`.
- `npm run test:cov` is available for manual analysis.

---
*Testing analysis: 2026-03-30*
*Update when test patterns change*
