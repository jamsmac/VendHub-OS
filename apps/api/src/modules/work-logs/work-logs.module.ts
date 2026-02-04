/**
 * Work Logs Module
 * Time tracking for employees
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { WorkLogsController } from './work-logs.controller';
import { WorkLogsService } from './work-logs.service';
import { WorkLog, TimeOffRequest, Timesheet } from './entities/work-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkLog, TimeOffRequest, Timesheet]),
    ScheduleModule.forRoot(),
  ],
  controllers: [WorkLogsController],
  providers: [WorkLogsService],
  exports: [WorkLogsService],
})
export class WorkLogsModule {}
