/**
 * Monitoring Controller
 *
 * Exposes Prometheus-compatible metrics endpoint and JSON health check.
 *
 * SECURITY NOTE:
 * - Both endpoints require admin/owner role authentication.
 * - For Prometheus scraping, use a service account with admin role
 *   or configure network-level access (K8s NetworkPolicy, Nginx allow-list).
 * - K8s liveness/readiness probes should use the HealthModule endpoints instead.
 */

import { Controller, Get, Header, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { MonitoringService } from "./monitoring.service";
import { Roles } from "../../common/decorators";
import {
  QueryMetricsDto,
  QueryHealthDto,
  HealthCheckResponseDto,
} from "./dto/monitoring.dto";

@ApiTags("Monitoring")
@Controller("monitoring")
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get("metrics")
  @Roles("admin", "owner")
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 scrapes/min per IP
  @Header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
  @ApiOperation({ summary: "Get Prometheus metrics" })
  @ApiResponse({
    status: 200,
    description: "Prometheus text exposition format metrics",
  })
  getMetrics(@Query() _query: QueryMetricsDto): string {
    return this.monitoringService.getMetrics();
  }

  @Get("health")
  @Roles("admin", "owner")
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 checks/min per IP
  @ApiOperation({ summary: "Get health check metrics" })
  @ApiResponse({
    status: 200,
    description: "JSON health check with system metrics summary",
    type: HealthCheckResponseDto,
  })
  getHealth(@Query() _query: QueryHealthDto): HealthCheckResponseDto {
    return this.monitoringService.getHealthMetrics() as unknown as HealthCheckResponseDto;
  }
}
