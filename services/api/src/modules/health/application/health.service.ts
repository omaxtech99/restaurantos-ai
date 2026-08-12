import { Injectable } from '@nestjs/common';
import type { HealthStatus } from '@restaurantos/types';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async check(): Promise<HealthStatus> {
    let database: 'up' | 'down' = 'down';
    let redis: 'up' | 'down' = 'down';

    try {
      await this.prismaService.prisma.$queryRaw`SELECT 1`;
      database = 'up';
    } catch {
      database = 'down';
    }

    redis = (await this.redisService.ping()) ? 'up' : 'down';

    const status =
      database === 'up' && redis === 'up'
        ? 'ok'
        : database === 'down' && redis === 'down'
          ? 'error'
          : 'degraded';

    return {
      status,
      checks: {
        database,
        redis,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
