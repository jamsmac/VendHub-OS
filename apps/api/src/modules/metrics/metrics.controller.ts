import { Controller, Get, Res } from "@nestjs/common";
import { ApiTags, ApiExcludeEndpoint, ApiOkResponse } from "@nestjs/swagger";
import { Response } from "express";
import { MetricsService } from "./metrics.service";
import { Roles } from "../../common/decorators/roles.decorator";

@ApiTags("Metrics")
@Controller("metrics")
@Roles("owner", "admin")
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @ApiExcludeEndpoint()
  @ApiOkResponse({ description: "Prometheus metrics in text/plain format" })
  async getMetrics(@Res() res: Response): Promise<void> {
    const metrics = await this.metricsService.getMetrics();
    res.set("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
    res.send(metrics);
  }
}
