import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Trip } from "../trips/entities/trip.entity";
import { TripAnomaly } from "../trips/entities/trip-anomaly.entity";
import { TripStop } from "../trips/entities/trip-stop.entity";
import { TripAnalyticsService } from "./trip-analytics.service";
import { TripAnalyticsController } from "./trip-analytics.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Trip, TripAnomaly, TripStop])],
  controllers: [TripAnalyticsController],
  providers: [TripAnalyticsService],
  exports: [TripAnalyticsService],
})
export class TripAnalyticsModule {}
