import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  ParseUUIDPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { Roles } from "../../../common/decorators/roles.decorator";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { ForecastService } from "../services/forecast.service";
import { RecommendationService } from "../services/recommendation.service";
import { GetRecommendationsDto } from "../dto/forecast-query.dto";

@ApiTags("Predictive Refill")
@ApiBearerAuth()
@Controller("predictive-refill")
export class PredictiveRefillController {
  constructor(
    private readonly forecastService: ForecastService,
    private readonly recommendationService: RecommendationService,
    @InjectQueue("predictive-refill") private readonly queue: Queue,
  ) {}

  @Get("forecast/:machineId")
  @Roles("owner", "admin", "manager", "operator")
  @ApiOperation({ summary: "Get slot-level forecast for a machine" })
  async getForecast(
    @Param("machineId", ParseUUIDPipe) machineId: string,
    @CurrentUser("organizationId") orgId: string,
  ) {
    return this.forecastService.forecastMachine(orgId, machineId);
  }

  @Get("recommendations")
  @Roles("owner", "admin", "manager", "operator")
  @ApiOperation({ summary: "List refill recommendations sorted by priority" })
  async getRecommendations(
    @Query() query: GetRecommendationsDto,
    @CurrentUser("organizationId") orgId: string,
  ) {
    return this.recommendationService.list(orgId, query);
  }

  @Post("recommendations/:id/mark-acted")
  @Roles("owner", "admin", "manager", "operator")
  @ApiOperation({ summary: "Mark recommendation as acted upon" })
  async markActed(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("organizationId") orgId: string,
  ) {
    return this.recommendationService.markActed(orgId, id);
  }

  @Post("trigger-refresh")
  @Roles("owner", "admin")
  @ApiOperation({
    summary: "Manually trigger predictive refill recalculation for all orgs",
  })
  @ApiResponse({ status: 201, description: "Refresh job enqueued" })
  async triggerRefresh(): Promise<{ message: string; jobId: string }> {
    const job = await this.queue.add(
      "recalc-all",
      {},
      {
        removeOnComplete: 10,
        removeOnFail: 5,
      },
    );
    return { message: "Refresh enqueued", jobId: String(job.id) };
  }
}
