import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
} from '@nestjs/terminus';
import { Public } from '../auth/decorators/public.decorator';
import { DatabaseHealthIndicator } from './indicators/database.health';
import { RedisHealthIndicator } from './indicators/redis.health';
import { MemoryHealthIndicator } from './indicators/memory.health';
import { DiskHealthIndicator } from './indicators/disk.health';

@ApiTags('Health')
@Public()
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: DatabaseHealthIndicator,
    private redis: RedisHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  /**
   * Basic health check - for load balancers and k8s probes
   */
  @Get()
  @ApiOperation({ summary: 'Basic health check' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2024-01-15T12:00:00.000Z' },
      },
    },
  })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async check(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Liveness probe - check if application is running
   */
  @Get('live')
  @ApiOperation({ summary: 'Liveness probe for Kubernetes' })
  @ApiResponse({ status: 200, description: 'Application is alive' })
  @ApiResponse({ status: 503, description: 'Application is not alive' })
  @HealthCheck()
  async liveness(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 500 * 1024 * 1024), // 500MB
    ]);
  }

  /**
   * Readiness probe - check if application is ready to receive traffic
   */
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe for Kubernetes' })
  @ApiResponse({ status: 200, description: 'Application is ready' })
  @ApiResponse({ status: 503, description: 'Application is not ready' })
  @HealthCheck()
  async readiness(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.db.isHealthy('database'),
      () => this.redis.isHealthy('redis'),
    ]);
  }

  /**
   * Detailed health check - for monitoring and debugging
   */
  @Get('detailed')
  @ApiOperation({ summary: 'Detailed health check with all components' })
  @ApiResponse({
    status: 200,
    description: 'Detailed health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        info: {
          type: 'object',
          example: {
            database: { status: 'up' },
            redis: { status: 'up' },
            memory: { status: 'up' },
            disk: { status: 'up' },
          },
        },
        details: { type: 'object' },
      },
    },
  })
  @ApiResponse({ status: 503, description: 'One or more components unhealthy' })
  @HealthCheck()
  async detailed(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.db.isHealthy('database'),
      () => this.redis.isHealthy('redis'),
      () => this.memory.checkHeap('memory_heap', 1024 * 1024 * 1024), // 1GB
      () => this.memory.checkRSS('memory_rss', 1024 * 1024 * 1024), // 1GB
      () => this.disk.checkStorage('disk', { thresholdPercent: 0.9, path: '/' }),
    ]);
  }

  /**
   * Version and build info
   */
  @Get('version')
  @ApiOperation({ summary: 'Get version and build information' })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'vendhub-api' },
        version: { type: 'string', example: '1.0.0' },
        environment: { type: 'string', example: 'production' },
        nodeVersion: { type: 'string', example: 'v20.10.0' },
        uptime: { type: 'number', example: 3600 },
        timestamp: { type: 'string', example: '2024-01-15T12:00:00.000Z' },
      },
    },
  })
  version() {
    return {
      name: 'vendhub-api',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
