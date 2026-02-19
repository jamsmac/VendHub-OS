/**
 * Employees Module
 */

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Employee, EmployeeDocument } from "./entities/employee.entity";
import { Department } from "./entities/department.entity";
import { Position } from "./entities/position.entity";
import { Attendance } from "./entities/attendance.entity";
import { LeaveRequest } from "./entities/leave-request.entity";
import { Payroll } from "./entities/payroll.entity";
import { PerformanceReview } from "./entities/performance-review.entity";
import { EmployeesService } from "./employees.service";
import { EmployeesController } from "./employees.controller";
import { DepartmentService } from "./services/department.service";
import { PositionService } from "./services/position.service";
import { AttendanceService } from "./services/attendance.service";
import { LeaveService } from "./services/leave.service";
import { PayrollService } from "./services/payroll.service";
import { PerformanceReviewService } from "./services/performance-review.service";

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
  providers: [
    EmployeesService,
    DepartmentService,
    PositionService,
    AttendanceService,
    LeaveService,
    PayrollService,
    PerformanceReviewService,
  ],
  exports: [EmployeesService],
})
export class EmployeesModule {}
