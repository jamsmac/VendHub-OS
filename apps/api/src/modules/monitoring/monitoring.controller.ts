/**
 * Monitoring Controller
 *
 * Exposes Prometheus-compatible metrics endpoint and JSON health check.
 *
 * SECURITY NOTE:
 * - `/metrics` is public so Prometheus can scrape without JWT.
 *   In production, restrict access via network policy (e.g. Kubernetes
 *   NetworkPolicy, Nginx IP allow-list) rather than application-level auth.
 * - The metrics endpoint has a strict rate limit to deter abuse.
 * - `/health` is a lightweight liveness probe -- also restricted.
 */

import {
  Controller,
  Get,
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { MonitoringService } from './monitoring.service';
import { Public } from '../../common/decorators';

@ApiTags('Monitoring')
@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('metrics')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 scrapes/min per IP
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOperation({ summary: 'Get Prometheus metrics' })
  @ApiResponse({
    status: 200,
    description: 'Prometheus text exposition format metrics',
  })
  getMetrics(): string {
    return this.monitoringService.getMetrics();
  }

  @Get('health')
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 checks/min per IP
  @ApiOperation({ summary: 'Get health check metrics' })
  @ApiResponse({
    status: 200,
    description: 'JSON health check with system metrics summary',
  })
  getHealth(): Record<string, any> {
    return this.monitoringService.getHealthMetrics();
  }
}
