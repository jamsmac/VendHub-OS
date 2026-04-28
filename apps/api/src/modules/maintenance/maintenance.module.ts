/**
 * Maintenance Module
 * Extended maintenance workflow for vending machines
 */

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScheduleModule } from "@nestjs/schedule";

import { WebPushModule } from "../web-push/web-push.module";
import { User } from "../users/entities/user.entity";
import { MaintenanceController } from "./maintenance.controller";
import { MaintenanceService } from "./maintenance.service";
import { MaintenanceNotificationListenerService } from "./services/maintenance-notification-listener.service";
import {
  MaintenanceRequest,
  MaintenancePart,
  MaintenanceWorkLog,
  MaintenanceSchedule,
} from "./entities/maintenance.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MaintenanceRequest,
      MaintenancePart,
      MaintenanceWorkLog,
      MaintenanceSchedule,
      User,
    ]),
    WebPushModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [MaintenanceController],
  providers: [MaintenanceService, MaintenanceNotificationListenerService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
