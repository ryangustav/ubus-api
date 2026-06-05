import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { HealthQuerySchema, type HealthQueryDto } from './health.dto';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Health check com Redis + DB (simulação de carga)',
    description:
      'GET /health?iterations=N&delayMs=M - N iterações de Redis+DB, M ms entre cada. Use para load test.',
  })
  @ApiQuery({
    name: 'iterations',
    required: false,
    type: Number,
    description: 'Iterações por request (1-100). Default: 1',
  })
  @ApiQuery({
    name: 'delayMs',
    required: false,
    type: Number,
    description: 'Delay em ms entre iterações (0-5000). Default: 0',
  })
  @ApiResponse({ status: 200, description: 'Status de saúde' })
  async check(@Query() query: Record<string, string>) {
    const parsed = HealthQuerySchema.safeParse({
      iterations: query.iterations,
      delayMs: query.delayMs,
    });
    const dto: HealthQueryDto = parsed.success
      ? parsed.data
      : { iterations: 1, delayMs: 0 };
    return this.health.check(dto);
  }
}
