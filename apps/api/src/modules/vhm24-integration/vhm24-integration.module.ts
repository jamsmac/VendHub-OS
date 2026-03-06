import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TripTaskLink } from "../trips/entities/trip-task-link.entity";
import { TripStop } from "../trips/entities/trip-stop.entity";
import { Trip } from "../trips/entities/trip.entity";
import { MachineLocationSync } from "./entities/machine-location-sync.entity";
import { TripReconciliation } from "../trips/entities/trip-reconciliation.entity";
import { Vhm24IntegrationService } from "./vhm24-integration.service";
import { Vhm24IntegrationController } from "./vhm24-integration.controller";
import { TripReconciliationService } from "./services/trip-reconciliation.service";
import { GpsProcessingService } from "../trips/services/gps-processing.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TripTaskLink,
      TripStop,
      Trip,
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
