/**
 * Trip Analytics Controller
 * 7 dashboard endpoints for trip/logistics analysis.
 */

import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { TripAnalyticsService } from "./trip-analytics.service";
import { CurrentOrganizationId } from "../../common/decorators/current-user.decorator";

class PeriodQueryDto {
  from?: string;
  to?: string;
}

@ApiTags("Trip Analytics")
@Controller("analytics/trips")
export class TripAnalyticsController {
  constructor(private readonly analyticsService: TripAnalyticsService) {}

  private parsePeriod(query: PeriodQueryDto) {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from
      ? new Date(query.from)
      : new Date(to.getTime() - 30 * 24 * 3600 * 1000); // default 30 days
    return { from, to };
  }

  @ApiOperation({ summary: "Get main trip analytics dashboard" })
  @Get("dashboard/main")
  getMainDashboard(
    @CurrentOrganizationId() orgId: string,
    @Query() query: PeriodQueryDto,
  ) {
    const { from, to } = this.parsePeriod(query);
    return this.analyticsService.getMainDashboard(orgId, from, to);
  }

  @ApiOperation({ summary: "Get activity analytics dashboard" })
  @Get("dashboard/activity")
  getActivityDashboard(
    @CurrentOrganizationId() orgId: string,
    @Query() query: PeriodQueryDto,
  ) {
    const { from, to } = this.parsePeriod(query);
    return this.analyticsService.getActivityDashboard(orgId, from, to);
  }

  @ApiOperation({ summary: "Get employee performance analytics dashboard" })
  @Get("dashboard/employees")
  getEmployeeDashboard(
    @CurrentOrganizationId() orgId: string,
    @Query() query: PeriodQueryDto,
  ) {
    const { from, to } = this.parsePeriod(query);
    return this.analyticsService.getEmployeeDashboard(orgId, from, to);
  }

  @ApiOperation({ summary: "Get vehicle performance analytics dashboard" })
  @Get("dashboard/vehicles")
  getVehiclesDashboard(
    @CurrentOrganizationId() orgId: string,
    @Query() query: PeriodQueryDto,
  ) {
    const { from, to } = this.parsePeriod(query);
    return this.analyticsService.getVehiclesDashboard(orgId, from, to);
  }

  @ApiOperation({ summary: "Get anomalies detection analytics dashboard" })
  @Get("dashboard/anomalies")
  getAnomaliesDashboard(
    @CurrentOrganizationId() orgId: string,
    @Query() query: PeriodQueryDto,
  ) {
    const { from, to } = this.parsePeriod(query);
    return this.analyticsService.getAnomaliesDashboard(orgId, from, to);
  }

  @ApiOperation({ summary: "Get taxi service analytics dashboard" })
  @Get("dashboard/taxi")
  getTaxiDashboard(
    @CurrentOrganizationId() orgId: string,
    @Query() query: PeriodQueryDto,
  ) {
    const { from, to } = this.parsePeriod(query);
    return this.analyticsService.getTaxiDashboard(orgId, from, to);
  }
}
