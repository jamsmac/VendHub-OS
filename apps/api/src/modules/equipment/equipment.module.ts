/**
 * Equipment Module
 * Equipment components, hopper types, spare parts, maintenance, movements, and washing schedules
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  EquipmentComponent,
  HopperType,
  SparePart,
  ComponentMaintenance,
  ComponentMovement,
  WashingSchedule,
} from './entities/equipment-component.entity';

import { EquipmentService } from './services/equipment.service';
import { HopperTypeService } from './services/hopper-type.service';
import { SparePartService } from './services/spare-part.service';
import { WashingScheduleService } from './services/washing-schedule.service';

import { EquipmentController } from './controllers/equipment.controller';
import { HopperTypeController } from './controllers/hopper-type.controller';
import { SparePartController } from './controllers/spare-part.controller';
import { WashingScheduleController } from './controllers/washing-schedule.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EquipmentComponent,
      HopperType,
      SparePart,
      ComponentMaintenance,
      ComponentMovement,
      WashingSchedule,
    ]),
  ],
  controllers: [
    EquipmentController,
    HopperTypeController,
    SparePartController,
    WashingScheduleController,
  ],
  providers: [
    EquipmentService,
    HopperTypeService,
    SparePartService,
    WashingScheduleService,
  ],
  exports: [
    EquipmentService,
    HopperTypeService,
    SparePartService,
    WashingScheduleService,
  ],
})
export class EquipmentModule {}
