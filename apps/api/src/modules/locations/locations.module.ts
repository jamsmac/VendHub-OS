import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LocationsService } from "./locations.service";
import { LocationsController } from "./locations.controller";
import { Location } from "./entities/location.entity";
import { LocationZone } from "./entities/location-zone.entity";
import {
  LocationContract,
  LocationContractPayment,
} from "./entities/location-contract.entity";
import { LocationEvent } from "./entities/location-event.entity";
import { LocationNote } from "./entities/location-note.entity";
import { LocationVisit } from "./entities/location-visit.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Location,
      LocationZone,
      LocationContract,
      LocationContractPayment,
      LocationEvent,
      LocationNote,
      LocationVisit,
    ]),
  ],
  controllers: [LocationsController],
  providers: [LocationsService],
  exports: [LocationsService],
})
export class LocationsModule {}
