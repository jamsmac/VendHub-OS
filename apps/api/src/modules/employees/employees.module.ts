/**
 * Employees Module
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee, EmployeeDocument } from './entities/employee.entity';
import { Department } from './entities/department.entity';
import { Position } from './entities/position.entity';
import { Attendance } from './entities/attendance.entity';
import { LeaveRequest } from './entities/leave-request.entity';
import { Payroll } from './entities/payroll.entity';
import { PerformanceReview } from './entities/performance-review.entity';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Employee,
      EmployeeDocument,
      Department,
      Position,
      Attendance,
      LeaveRequest,
      Payroll,
      PerformanceReview,
    ]),
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
