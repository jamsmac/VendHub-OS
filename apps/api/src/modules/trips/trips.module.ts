import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TripsService } from "./trips.service";
import { TripsController } from "./trips.controller";
import { TripsCronService } from "./trips.cron";
import { GpsProcessingService } from "./services/gps-processing.service";
import { TripRouteService } from "./services/trip-route.service";
import { TripAnalyticsService } from "./services/trip-analytics.service";
import { Trip } from "./entities/trip.entity";
import { TripPoint } from "./entities/trip-point.entity";
import { TripStop } from "./entities/trip-stop.entity";
import { TripAnomaly } from "./entities/trip-anomaly.entity";
import { TripTaskLink } from "./entities/trip-task-link.entity";
import { TripReconciliation } from "./entities/trip-reconciliation.entity";
import { Vehicle } from "../vehicles/entities/vehicle.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Trip,
      TripPoint,
      TripStop,
      TripAnomaly,
      TripTaskLink,
      TripReconciliation,
      Vehicle,
    ]),
  ],
  controllers: [TripsController],
  providers: [
    TripsService,
    TripsCronService,
    GpsProcessingService,
    TripRouteService,
    TripAnalyticsService,
  ],
  exports: [
    TripsService,
    GpsProcessingService,
    TripRouteService,
    TripAnalyticsService,
  ],
})
export class TripsModule {}
