/**
 * Monitoring Controller
 *
 * Exposes Prometheus-compatible metrics endpoint and JSON health check.
 *
 * SECURITY:
 * - Metrics endpoints are @Public() (bypass JWT) but protected by METRICS_API_KEY.
 * - Prometheus sends the key via Authorization: Bearer <key> header.
 * - If METRICS_API_KEY is not set, metrics endpoints fail closed with 403.
 * - K8s liveness/readiness probes should use the HealthModule endpoints instead.
 */

import {
  Controller,
  Get,
  Header,
  Query,
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Request } from "express";
import { MonitoringService } from "./monitoring.service";
import { Public } from "../auth/decorators/public.decorator";
import {
  QueryMetricsDto,
  QueryHealthDto,
  HealthCheckResponseDto,
} from "./dto/monitoring.dto";

@Injectable()
class MetricsKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const metricsKey = this.configService.get<string>("METRICS_API_KEY");
    if (!metricsKey) {
      throw new ForbiddenException(
        "METRICS_API_KEY not configured - metrics endpoint disabled",
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;
    const queryKey = request.query["key"] as string | undefined;

    const providedKey = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : queryKey;

    if (
      providedKey &&
      providedKey.length === metricsKey.length &&
      require("crypto").timingSafeEqual(
        Buffer.from(providedKey),
        Buffer.from(metricsKey),
      )
    )
      return true;

    throw new ForbiddenException("Invalid metrics API key");
  }
}

@ApiTags("Monitoring")
@Controller("monitoring")
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get("metrics")
  @Public()
  @UseGuards(MetricsKeyGuard)
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
  @Public()
  @UseGuards(MetricsKeyGuard)
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
