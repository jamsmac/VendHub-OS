import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  private readonly redis: Redis;

  constructor(private readonly configService: ConfigService) {
    super();

    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (redisUrl) {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });
    }
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    if (!this.redis) {
      return this.getStatus(key, true, {
        status: 'not_configured',
        message: 'Redis not configured',
      });
    }

    const startTime = Date.now();

    try {
      // Ping Redis
      const result = await this.redis.ping();
      const responseTime = Date.now() - startTime;

      if (result !== 'PONG') {
        throw new Error(`Unexpected ping response: ${result}`);
      }

      // Get Redis info
      const info = await this.getRedisInfo();

      return this.getStatus(key, true, {
        responseTime: `${responseTime}ms`,
        connected: true,
        ...info,
      });
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      throw new HealthCheckError(
        'Redis check failed',
        this.getStatus(key, false, {
          responseTime: `${responseTime}ms`,
          connected: false,
          error: error.message,
        }),
      );
    }
  }

  private async getRedisInfo(): Promise<Record<string, any>> {
    try {
      const infoRaw = await this.redis.info('memory');
      const lines = infoRaw.split('\r\n');

      const info: Record<string, any> = {};

      for (const line of lines) {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          if (key === 'used_memory_human') {
            info.usedMemory = value;
          }
          if (key === 'used_memory_peak_human') {
            info.peakMemory = value;
          }
        }
      }

      // Get connected clients
      const clientsRaw = await this.redis.info('clients');
      const clientsLine = clientsRaw.split('\r\n').find(l => l.startsWith('connected_clients:'));
      if (clientsLine) {
        info.connectedClients = parseInt(clientsLine.split(':')[1], 10);
      }

      return info;
    } catch {
      return {};
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}
