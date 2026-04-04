import { Injectable, Inject } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import type Redis from 'ioredis';
import { DRIZZLE } from '../../shared/database/database.module';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../shared/database/schema';
import { municipalities } from '../../shared/database/schema/municipality.schema';
import { sql } from 'drizzle-orm';
import type { HealthQueryDto } from './health.dto';

export interface HealthResult {
  ok: boolean;
  timestamp: string;
  redis: { ok: boolean; latencyMs?: number; error?: string };
  db: { ok: boolean; latencyMs?: number; rowCount?: number; error?: string };
  load?: {
    iterations: number;
    totalRedisMs: number;
    totalDbMs: number;
    totalMs: number;
  };
  redisConfig?: {
    maxmemoryPolicy: string;
    warning?: string;
  };
}

@Injectable()
export class HealthService {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async check(query?: HealthQueryDto): Promise<HealthResult> {
    const timestamp = new Date().toISOString();
    const iterations = query?.iterations ?? 1;
    const delayMs = query?.delayMs ?? 0;

    const result: HealthResult = {
      ok: true,
      timestamp,
      redis: { ok: false },
      db: { ok: false },
    };

    // Redis
    try {
      const redisStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        const key = `health:${Date.now()}:${i}`;
        await this.redis.set(key, 'ok', 'EX', 10);
        await this.redis.get(key);
        if (delayMs > 0) await this.sleep(delayMs);
      }
      result.redis = {
        ok: true,
        latencyMs: Math.round(performance.now() - redisStart),
      };
      
      // Check eviction policy
      const config = (await this.redis.config('GET', 'maxmemory-policy')) as string[];
      if (config && config.length >= 2) {
        const policy = config[1];
        result.redisConfig = { maxmemoryPolicy: policy };
        if (policy !== 'noeviction') {
          const warnMsg = `IMPORTANT! Eviction policy is ${policy}. It should be "noeviction" for BullMQ stability.`;
          console.warn(warnMsg);
          result.redisConfig.warning = warnMsg;
        }
      }
    } catch (e) {
      result.ok = false;
      result.redis = {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }

    // DB
    try {
      const dbStart = performance.now();
      let rowCount = 0;
      for (let i = 0; i < iterations; i++) {
        const rows = await this.db
          .select({ count: sql<number>`count(*)::int` })
          .from(municipalities);
        rowCount = Number(rows[0]?.count ?? 0);
        if (delayMs > 0) await this.sleep(delayMs);
      }
      result.db = {
        ok: true,
        latencyMs: Math.round(performance.now() - dbStart),
        rowCount,
      };
    } catch (e) {
      result.ok = false;
      result.db = {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }

    if (iterations > 1) {
      result.load = {
        iterations,
        totalRedisMs: result.redis.latencyMs ?? 0,
        totalDbMs: result.db.latencyMs ?? 0,
        totalMs:
          (result.redis.latencyMs ?? 0) + (result.db.latencyMs ?? 0),
      };
    }

    return result;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
