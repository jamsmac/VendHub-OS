import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScheduleModule } from "@nestjs/schedule";
import { RoutesService } from "./routes.service";
import { RouteOptimizationService } from "./route-optimization.service";
import { RoutesController } from "./routes.controller";
import { RoutesCronService } from "./routes.cron";
import { GpsProcessingService } from "./services/gps-processing.service";
import { RouteTrackingService } from "./services/route-tracking.service";
import { RouteAnalyticsService } from "./services/route-analytics.service";
import { Route, RouteStop } from "./entities/route.entity";
import { RoutePoint } from "./entities/route-point.entity";
import { RouteAnomaly } from "./entities/route-anomaly.entity";
import { RouteTaskLink } from "./entities/route-task-link.entity";
import { Vehicle } from "../vehicles/entities/vehicle.entity";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      Route,
      RouteStop,
      RoutePoint,
      RouteAnomaly,
      RouteTaskLink,
      Vehicle,
    ]),
  ],
  controllers: [RoutesController],
  providers: [
    RoutesService,
    RouteOptimizationService,
    RoutesCronService,
    GpsProcessingService,
    RouteTrackingService,
    RouteAnalyticsService,
  ],
  exports: [
    RoutesService,
    RouteOptimizationService,
    GpsProcessingService,
    RouteTrackingService,
    RouteAnalyticsService,
  ],
})
export class RoutesModule {}
