/**
 * Maintenance Module
 * Extended maintenance workflow for vending machines
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';
import {
  MaintenanceRequest,
  MaintenancePart,
  MaintenanceWorkLog,
  MaintenanceSchedule,
} from './entities/maintenance.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MaintenanceRequest,
      MaintenancePart,
      MaintenanceWorkLog,
      MaintenanceSchedule,
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [MaintenanceController],
  providers: [MaintenanceService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
