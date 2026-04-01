import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RouteTaskLink } from "../routes/entities/route-task-link.entity";
import { Route, RouteStop } from "../routes/entities/route.entity";
import { MachineLocationSync } from "./entities/machine-location-sync.entity";
import { TripReconciliation } from "../trips/entities/trip-reconciliation.entity";
import { Vhm24IntegrationService } from "./vhm24-integration.service";
import { Vhm24IntegrationController } from "./vhm24-integration.controller";
import { TripReconciliationService } from "./services/trip-reconciliation.service";
import { GpsProcessingService } from "../routes/services/gps-processing.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RouteTaskLink,
      RouteStop,
      Route,
      MachineLocationSync,
      TripReconciliation,
    ]),
  ],
  controllers: [Vhm24IntegrationController],
  providers: [
    Vhm24IntegrationService,
    TripReconciliationService,
    GpsProcessingService,
  ],
  exports: [Vhm24IntegrationService, TripReconciliationService],
})
export class Vhm24IntegrationModule {}
