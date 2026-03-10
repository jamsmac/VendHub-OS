import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bullmq";
import { MachinesService } from "./machines.service";
import { MachinesCoreService } from "./machines-core.service";
import { MachinesMaintenanceService } from "./machines-maintenance.service";
import { MachinesAssetService } from "./machines-asset.service";
import { MachinesController } from "./machines.controller";
import {
  Machine,
  MachineSlot,
  MachineLocationHistory,
  MachineComponent,
  MachineErrorLog,
  MachineMaintenanceSchedule,
} from "./entities/machine.entity";
import { WriteoffProcessor } from "./processors/writeoff.processor";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Machine,
      MachineSlot,
      MachineLocationHistory,
      MachineComponent,
      MachineErrorLog,
      MachineMaintenanceSchedule,
    ]),
    BullModule.registerQueue({ name: "machine-writeoff" }),
  ],
  controllers: [MachinesController],
  providers: [
    MachinesService,
    MachinesCoreService,
    MachinesMaintenanceService,
    MachinesAssetService,
    WriteoffProcessor,
  ],
  exports: [MachinesService],
})
export class MachinesModule {}
