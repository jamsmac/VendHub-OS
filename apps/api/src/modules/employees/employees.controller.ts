/**
 * Employees Controller
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  TerminateEmployeeDto,
  LinkUserDto,
  EmployeeFilterDto,
  EmployeeDto,
  EmployeeListDto,
  EmployeeStatsDto,
} from './dto/employee.dto';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  QueryDepartmentsDto,
  DepartmentDto,
  DepartmentListDto,
} from './dto/department.dto';
import {
  CheckInDto,
  CheckOutDto,
  QueryAttendanceDto,
  AttendanceDto,
  AttendanceListDto,
  DailyAttendanceReportDto,
} from './dto/attendance.dto';
import {
  CreateLeaveRequestDto,
  RejectLeaveDto,
  QueryLeaveRequestsDto,
  LeaveRequestDto,
  LeaveRequestListDto,
  LeaveBalanceDto,
} from './dto/leave-request.dto';
import {
  CalculatePayrollDto,
  QueryPayrollDto,
  PayrollDto,
  PayrollListDto,
} from './dto/payroll.dto';
import {
  CreateReviewDto,
  SubmitReviewDto,
  QueryReviewsDto,
  PerformanceReviewDto,
  PerformanceReviewListDto,
} from './dto/performance-review.dto';
import { CurrentUser, Roles } from '../../common/decorators';
import { EmployeeRole } from './entities/employee.entity';

@ApiTags('Employees')
@ApiBearerAuth()
@Controller('employees')
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  @Post()
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Create employee' })
  @ApiResponse({ status: 201, type: EmployeeDto })
  async create(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateEmployeeDto,
  ): Promise<EmployeeDto> {
    return this.service.createEmployee(organizationId, dto);
  }

  @Get()
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get employees list' })
  @ApiResponse({ status: 200, type: EmployeeListDto })
  async getList(
    @CurrentUser('organizationId') organizationId: string,
    @Query() filter: EmployeeFilterDto,
  ): Promise<EmployeeListDto> {
    return this.service.getEmployees(organizationId, filter);
  }

  @Get('stats')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get employees statistics' })
  @ApiResponse({ status: 200, type: EmployeeStatsDto })
  async getStats(
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<EmployeeStatsDto> {
    return this.service.getStats(organizationId);
  }

  @Get('active')
  @Roles('operator', 'warehouse', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get active employees (paginated)' })
  @ApiResponse({ status: 200 })
  async getActive(
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<{ items: EmployeeDto[]; total: number }> {
    return this.service.getActiveEmployees(organizationId);
  }

  @Get('by-role/:role')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get employees by role (paginated)' })
  @ApiParam({ name: 'role', enum: EmployeeRole })
  @ApiResponse({ status: 200 })
  async getByRole(
    @Param('role') role: EmployeeRole,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<{ items: EmployeeDto[]; total: number }> {
    return this.service.getEmployeesByRole(organizationId, role);
  }

  @Get('by-telegram/:telegramUserId')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get employee by Telegram ID' })
  @ApiParam({ name: 'telegramUserId', description: 'Telegram user ID' })
  @ApiResponse({ status: 200, type: EmployeeDto })
  async getByTelegram(
    @Param('telegramUserId') telegramUserId: string,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<EmployeeDto | null> {
    return this.service.getEmployeeByTelegram(organizationId, telegramUserId);
  }

  @Get(':id')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get employee by ID' })
  @ApiParam({ name: 'id', description: 'Employee ID' })
  @ApiResponse({ status: 200, type: EmployeeDto })
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<EmployeeDto> {
    return this.service.getEmployee(id, organizationId);
  }

  @Put(':id')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Update employee' })
  @ApiParam({ name: 'id', description: 'Employee ID' })
  @ApiResponse({ status: 200, type: EmployeeDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: UpdateEmployeeDto,
  ): Promise<EmployeeDto> {
    return this.service.updateEmployee(id, organizationId, dto);
  }

  @Delete(':id')
  @Roles('admin', 'owner')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete employee (soft delete)' })
  @ApiParam({ name: 'id', description: 'Employee ID' })
  @ApiResponse({ status: 204 })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<void> {
    return this.service.deleteEmployee(id, organizationId);
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  @Post(':id/terminate')
  @Roles('manager', 'admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Terminate employee' })
  @ApiParam({ name: 'id', description: 'Employee ID' })
  @ApiResponse({ status: 200, type: EmployeeDto })
  async terminate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: TerminateEmployeeDto,
  ): Promise<EmployeeDto> {
    return this.service.terminateEmployee(id, organizationId, dto);
  }

  @Post(':id/link-user')
  @Roles('admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Link employee to user account' })
  @ApiParam({ name: 'id', description: 'Employee ID' })
  @ApiResponse({ status: 200, type: EmployeeDto })
  async linkUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: LinkUserDto,
  ): Promise<EmployeeDto> {
    return this.service.linkToUser(id, organizationId, dto.userId);
  }

  @Post(':id/unlink-user')
  @Roles('admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unlink employee from user account' })
  @ApiParam({ name: 'id', description: 'Employee ID' })
  @ApiResponse({ status: 200, type: EmployeeDto })
  async unlinkUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<EmployeeDto> {
    return this.service.unlinkFromUser(id, organizationId);
  }

  // ============================================================================
  // DEPARTMENTS
  // ============================================================================

  @Post('departments')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Create department' })
  @ApiResponse({ status: 201, type: DepartmentDto })
  async createDepartment(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateDepartmentDto,
  ): Promise<DepartmentDto> {
    return this.service.createDepartment(organizationId, dto);
  }

  @Get('departments')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'List departments' })
  @ApiResponse({ status: 200, type: DepartmentListDto })
  async getDepartments(
    @CurrentUser('organizationId') organizationId: string,
    @Query() query: QueryDepartmentsDto,
  ): Promise<DepartmentListDto> {
    return this.service.getDepartments(organizationId, query);
  }

  @Get('departments/:id')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get department by ID' })
  @ApiParam({ name: 'id', description: 'Department ID' })
  @ApiResponse({ status: 200, type: DepartmentDto })
  async getDepartment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<DepartmentDto> {
    return this.service.getDepartment(id, organizationId);
  }

  @Put('departments/:id')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Update department' })
  @ApiParam({ name: 'id', description: 'Department ID' })
  @ApiResponse({ status: 200, type: DepartmentDto })
  async updateDepartment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: UpdateDepartmentDto,
  ): Promise<DepartmentDto> {
    return this.service.updateDepartment(id, organizationId, dto);
  }

  @Delete('departments/:id')
  @Roles('admin', 'owner')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete department (soft delete)' })
  @ApiParam({ name: 'id', description: 'Department ID' })
  @ApiResponse({ status: 204 })
  async deleteDepartment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<void> {
    return this.service.deleteDepartment(id, organizationId);
  }

  // ============================================================================
  // POSITIONS
  // ============================================================================

  @Post('positions')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Create position' })
  @ApiResponse({ status: 201 })
  async createPosition(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: any,
  ) {
    return this.service.createPosition(organizationId, dto);
  }

  @Get('positions')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'List positions' })
  @ApiResponse({ status: 200 })
  async getPositions(
    @CurrentUser('organizationId') organizationId: string,
    @Query() query: any,
  ) {
    return this.service.getPositions(organizationId, query);
  }

  @Get('positions/:id')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get position by ID' })
  @ApiParam({ name: 'id', description: 'Position ID' })
  @ApiResponse({ status: 200 })
  async getPosition(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.service.getPosition(id, organizationId);
  }

  @Put('positions/:id')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Update position' })
  @ApiParam({ name: 'id', description: 'Position ID' })
  @ApiResponse({ status: 200 })
  async updatePosition(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: any,
  ) {
    return this.service.updatePosition(id, organizationId, dto);
  }

  // ============================================================================
  // ATTENDANCE
  // ============================================================================

  @Post('attendance/check-in')
  @Roles('operator', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Employee check-in' })
  @ApiResponse({ status: 201, type: AttendanceDto })
  async checkIn(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CheckInDto,
  ): Promise<AttendanceDto> {
    return this.service.checkIn(organizationId, dto);
  }

  @Post('attendance/check-out')
  @Roles('operator', 'manager', 'admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Employee check-out' })
  @ApiResponse({ status: 200, type: AttendanceDto })
  async checkOut(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CheckOutDto,
  ): Promise<AttendanceDto> {
    return this.service.checkOut(organizationId, dto);
  }

  @Get('attendance')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'List attendance records' })
  @ApiResponse({ status: 200, type: AttendanceListDto })
  async getAttendance(
    @CurrentUser('organizationId') organizationId: string,
    @Query() query: QueryAttendanceDto,
  ): Promise<AttendanceListDto> {
    return this.service.getAttendance(organizationId, query);
  }

  @Get('attendance/daily')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get daily attendance report' })
  @ApiResponse({ status: 200, type: DailyAttendanceReportDto })
  async getDailyAttendance(
    @CurrentUser('organizationId') organizationId: string,
    @Query('date') date?: string,
  ): Promise<DailyAttendanceReportDto> {
    return this.service.getDailyReport(organizationId, date);
  }

  // ============================================================================
  // LEAVE REQUESTS
  // ============================================================================

  @Post('leave')
  @Roles('operator', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Create leave request' })
  @ApiResponse({ status: 201, type: LeaveRequestDto })
  async createLeaveRequest(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateLeaveRequestDto,
  ): Promise<LeaveRequestDto> {
    return this.service.createLeaveRequest(organizationId, dto);
  }

  @Get('leave')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'List leave requests' })
  @ApiResponse({ status: 200, type: LeaveRequestListDto })
  async getLeaveRequests(
    @CurrentUser('organizationId') organizationId: string,
    @Query() query: QueryLeaveRequestsDto,
  ): Promise<LeaveRequestListDto> {
    return this.service.getLeaveRequests(organizationId, query);
  }

  @Get('leave/balance/:employeeId')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get employee leave balance' })
  @ApiParam({ name: 'employeeId', description: 'Employee ID' })
  @ApiResponse({ status: 200, type: LeaveBalanceDto })
  async getLeaveBalance(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<LeaveBalanceDto> {
    return this.service.getLeaveBalance(organizationId, employeeId);
  }

  @Post('leave/:id/approve')
  @Roles('manager', 'admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve leave request' })
  @ApiParam({ name: 'id', description: 'Leave request ID' })
  @ApiResponse({ status: 200, type: LeaveRequestDto })
  async approveLeave(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
  ): Promise<LeaveRequestDto> {
    return this.service.approveLeave(id, organizationId, userId);
  }

  @Post('leave/:id/reject')
  @Roles('manager', 'admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject leave request' })
  @ApiParam({ name: 'id', description: 'Leave request ID' })
  @ApiResponse({ status: 200, type: LeaveRequestDto })
  async rejectLeave(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: RejectLeaveDto,
  ): Promise<LeaveRequestDto> {
    return this.service.rejectLeave(id, organizationId, userId, dto);
  }

  @Post('leave/:id/cancel')
  @Roles('operator', 'manager', 'admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel leave request' })
  @ApiParam({ name: 'id', description: 'Leave request ID' })
  @ApiResponse({ status: 200, type: LeaveRequestDto })
  async cancelLeave(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<LeaveRequestDto> {
    return this.service.cancelLeave(id, organizationId);
  }

  // ============================================================================
  // PAYROLL
  // ============================================================================

  @Post('payroll/calculate')
  @Roles('accountant', 'admin', 'owner')
  @ApiOperation({ summary: 'Calculate payroll for an employee' })
  @ApiResponse({ status: 201, type: PayrollDto })
  async calculatePayroll(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CalculatePayrollDto,
  ): Promise<PayrollDto> {
    return this.service.calculatePayroll(organizationId, dto, userId);
  }

  @Get('payroll')
  @Roles('accountant', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'List payrolls' })
  @ApiResponse({ status: 200, type: PayrollListDto })
  async getPayrolls(
    @CurrentUser('organizationId') organizationId: string,
    @Query() query: QueryPayrollDto,
  ): Promise<PayrollListDto> {
    return this.service.getPayrolls(organizationId, query);
  }

  @Get('payroll/:id')
  @Roles('accountant', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get payroll by ID' })
  @ApiParam({ name: 'id', description: 'Payroll ID' })
  @ApiResponse({ status: 200, type: PayrollDto })
  async getPayroll(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<PayrollDto> {
    return this.service.getPayroll(id, organizationId);
  }

  @Post('payroll/:id/approve')
  @Roles('admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve payroll' })
  @ApiParam({ name: 'id', description: 'Payroll ID' })
  @ApiResponse({ status: 200, type: PayrollDto })
  async approvePayroll(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
  ): Promise<PayrollDto> {
    return this.service.approvePayroll(id, organizationId, userId);
  }

  @Post('payroll/:id/pay')
  @Roles('admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark payroll as paid' })
  @ApiParam({ name: 'id', description: 'Payroll ID' })
  @ApiResponse({ status: 200, type: PayrollDto })
  async payPayroll(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<PayrollDto> {
    return this.service.payPayroll(id, organizationId);
  }

  // ============================================================================
  // PERFORMANCE REVIEWS
  // ============================================================================

  @Post('reviews')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Create performance review' })
  @ApiResponse({ status: 201, type: PerformanceReviewDto })
  async createReview(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateReviewDto,
  ): Promise<PerformanceReviewDto> {
    return this.service.createReview(organizationId, dto);
  }

  @Get('reviews')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'List performance reviews' })
  @ApiResponse({ status: 200, type: PerformanceReviewListDto })
  async getReviews(
    @CurrentUser('organizationId') organizationId: string,
    @Query() query: QueryReviewsDto,
  ): Promise<PerformanceReviewListDto> {
    return this.service.getReviews(organizationId, query);
  }

  @Get('reviews/:id')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get performance review by ID' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({ status: 200, type: PerformanceReviewDto })
  async getReview(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<PerformanceReviewDto> {
    return this.service.getReview(id, organizationId);
  }

  @Post('reviews/:id/submit')
  @Roles('manager', 'admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit performance review with ratings' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({ status: 200, type: PerformanceReviewDto })
  async submitReview(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: SubmitReviewDto,
  ): Promise<PerformanceReviewDto> {
    return this.service.submitReview(id, organizationId, dto);
  }
}
