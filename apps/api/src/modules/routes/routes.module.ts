import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScheduleModule } from "@nestjs/schedule";
import { RoutesService } from "./routes.service";
import { RouteOptimizationService } from "./route-optimization.service";
import { RouteOptimizerService } from "./services/route-optimizer.service";
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
import { RefillRecommendation } from "../predictive-refill/entities/refill-recommendation.entity";
import { Machine } from "../machines/entities/machine.entity";

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
      RefillRecommendation,
      Machine,
    ]),
  ],
  controllers: [RoutesController],
  providers: [
    RoutesService,
    RouteOptimizationService,
    RouteOptimizerService,
    RoutesCronService,
    GpsProcessingService,
    RouteTrackingService,
    RouteAnalyticsService,
  ],
  exports: [
    RoutesService,
    RouteOptimizationService,
    RouteOptimizerService,
    GpsProcessingService,
    RouteTrackingService,
    RouteAnalyticsService,
  ],
})
export class RoutesModule {}
