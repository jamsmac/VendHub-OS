import { Controller, Get, Res, UnauthorizedException } from "@nestjs/common";
import { ApiTags, ApiExcludeEndpoint, ApiOkResponse } from "@nestjs/swagger";
import { Response } from "express";
import { ConfigService } from "@nestjs/config";
import { MetricsService } from "./metrics.service";
import { Public } from "../auth/decorators/public.decorator";

@ApiTags("Metrics")
@Controller("metrics")
export class MetricsController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Prometheus metrics endpoint.
   *
   * Auth: either a valid JWT (owner/admin) or METRICS_TOKEN query/header.
   * The token-based auth lets Grafana Agent scrape without a JWT.
   */
  @Get()
  @Public()
  @ApiExcludeEndpoint()
  @ApiOkResponse({ description: "Prometheus metrics in text/plain format" })
  async getMetrics(@Res() res: Response): Promise<void> {
    // Validate metrics token — required in production (fail-closed)
    const metricsToken = this.configService.get<string>("METRICS_TOKEN");
    const nodeEnv = this.configService.get<string>("NODE_ENV");

    if (!metricsToken && nodeEnv === "production") {
      throw new UnauthorizedException(
        "METRICS_TOKEN not configured — metrics disabled in production",
      );
    }

    if (metricsToken) {
      const request = res.req;
      const providedToken =
        (request.query?.token as string) ||
        (request.headers["x-metrics-token"] as string);

      if (providedToken !== metricsToken) {
        throw new UnauthorizedException("Invalid metrics token");
      }
    }

    const metrics = await this.metricsService.getMetrics();
    res.set("Content-Type", this.metricsService.getContentType());
    res.send(metrics);
  }
}
