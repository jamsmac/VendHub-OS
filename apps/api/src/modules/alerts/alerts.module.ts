/**
 * Alerts Module
 * Alert rules and monitoring for vending machine metrics
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AlertRule, AlertHistory } from './entities/alert-rule.entity';
import { AlertsService } from './alerts.service';
import { AlertEngineService } from './alert-engine.service';
import { AlertsController } from './alerts.controller';
import { Machine } from '../machines/entities/machine.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AlertRule,
      AlertHistory,
      Machine,
    ]),
  ],
  controllers: [AlertsController],
  providers: [AlertsService, AlertEngineService],
  exports: [AlertsService, AlertEngineService],
})
export class AlertsModule {}
