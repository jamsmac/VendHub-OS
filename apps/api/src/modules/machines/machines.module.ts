import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bullmq";
import { MachinesService } from "./machines.service";
import { MachinesCoreService } from "./machines-core.service";
import { MachinesMaintenanceService } from "./machines-maintenance.service";
import { MachinesAssetService } from "./machines-asset.service";
import { MachineTemplatesService } from "./machine-templates.service";
import { MachinesController } from "./machines.controller";
import { MachineTemplatesController } from "./machine-templates.controller";
import {
  Machine,
  MachineSlot,
  MachineLocationHistory,
  MachineComponent,
  SimUsageLog,
  MachineConnectivity,
  MachineExpense,
  MachineErrorLog,
  MachineMaintenanceSchedule,
} from "./entities/machine.entity";
import { MachineTemplate } from "./entities/machine-template.entity";
import { WriteoffProcessor } from "./processors/writeoff.processor";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Machine,
      MachineSlot,
      MachineLocationHistory,
      MachineComponent,
      SimUsageLog,
      MachineConnectivity,
      MachineExpense,
      MachineErrorLog,
      MachineMaintenanceSchedule,
      MachineTemplate,
    ]),
    BullModule.registerQueue({ name: "machine-writeoff" }),
  ],
  controllers: [MachinesController, MachineTemplatesController],
  providers: [
    MachinesService,
    MachinesCoreService,
    MachinesMaintenanceService,
    MachinesAssetService,
    MachineTemplatesService,
    WriteoffProcessor,
  ],
  exports: [MachinesService, MachineTemplatesService],
})
export class MachinesModule {}
