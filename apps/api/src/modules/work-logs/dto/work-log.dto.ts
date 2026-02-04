/**
 * Work Logs Module DTOs
 */

import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
  IsDate,
  IsInt,
  Min,
  Max,
  Matches,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  WorkLogType,
  WorkLogStatus,
  ActivityType,
  TimeOffType,
  TimeOffStatus,
} from '../entities/work-log.entity';

// ============================================================================
// WORK LOG DTOs
// ============================================================================

export class CreateWorkLogDto {
  @ApiProperty({ description: 'Employee ID' })
  @IsUUID()
  employeeId: string;

  @ApiProperty({ description: 'Work date' })
  @IsDate()
  @Type(() => Date)
  workDate: Date;

  @ApiProperty({ enum: WorkLogType, default: WorkLogType.REGULAR })
  @IsEnum(WorkLogType)
  @IsOptional()
  workType?: WorkLogType = WorkLogType.REGULAR;

  @ApiProperty({ enum: ActivityType })
  @IsEnum(ActivityType)
  activityType: ActivityType;

  @ApiProperty({ description: 'Clock in time (HH:mm)', example: '09:00' })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'clockIn must be in HH:mm format' })
  clockIn: string;

  @ApiProperty({ description: 'Clock out time (HH:mm)', example: '18:00' })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'clockOut must be in HH:mm format' })
  clockOut: string;

  @ApiPropertyOptional({ description: 'Break duration in minutes', default: 0 })
  @IsInt()
  @Min(0)
  @Max(480)
  @IsOptional()
  breakMinutes?: number = 0;

  @ApiPropertyOptional({ description: 'Overtime minutes', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  overtimeMinutes?: number = 0;

  @ApiProperty({ description: 'Work description' })
  @IsString()
  @MaxLength(2000)
  description: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Task ID' })
  @IsUUID()
  @IsOptional()
  taskId?: string;

  @ApiPropertyOptional({ description: 'Machine ID' })
  @IsUUID()
  @IsOptional()
  machineId?: string;

  @ApiPropertyOptional({ description: 'Maintenance request ID' })
  @IsUUID()
  @IsOptional()
  maintenanceRequestId?: string;

  @ApiPropertyOptional({ description: 'Check-in coordinates' })
  @IsNumber()
  @IsOptional()
  checkInLatitude?: number;

  @ApiPropertyOptional({ description: 'Check-in coordinates' })
  @IsNumber()
  @IsOptional()
  checkInLongitude?: number;

  @ApiPropertyOptional({ description: 'Check-out coordinates' })
  @IsNumber()
  @IsOptional()
  checkOutLatitude?: number;

  @ApiPropertyOptional({ description: 'Check-out coordinates' })
  @IsNumber()
  @IsOptional()
  checkOutLongitude?: number;

  @ApiPropertyOptional({ description: 'Hourly rate' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  hourlyRate?: number;
}

export class UpdateWorkLogDto extends PartialType(CreateWorkLogDto) {}

export class ClockInDto {
  @ApiPropertyOptional({ description: 'Latitude' })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude' })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class ClockOutDto {
  @ApiProperty({ description: 'Work log ID' })
  @IsUUID()
  workLogId: string;

  @ApiPropertyOptional({ description: 'Latitude' })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude' })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Work description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Break minutes' })
  @IsInt()
  @Min(0)
  @IsOptional()
  breakMinutes?: number;
}

export class ApproveWorkLogDto {
  @ApiPropertyOptional({ description: 'Hourly rate override' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  hourlyRate?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class RejectWorkLogDto {
  @ApiProperty({ description: 'Rejection reason' })
  @IsString()
  reason: string;
}

export class WorkLogQueryDto {
  @ApiPropertyOptional({ description: 'Employee ID' })
  @IsUUID()
  @IsOptional()
  employeeId?: string;

  @ApiPropertyOptional({ description: 'Start date' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @ApiPropertyOptional({ description: 'End date' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @ApiPropertyOptional({ enum: WorkLogStatus })
  @IsEnum(WorkLogStatus)
  @IsOptional()
  status?: WorkLogStatus;

  @ApiPropertyOptional({ enum: WorkLogType })
  @IsEnum(WorkLogType)
  @IsOptional()
  workType?: WorkLogType;

  @ApiPropertyOptional({ enum: ActivityType })
  @IsEnum(ActivityType)
  @IsOptional()
  activityType?: ActivityType;

  @ApiPropertyOptional({ description: 'Task ID' })
  @IsUUID()
  @IsOptional()
  taskId?: string;

  @ApiPropertyOptional({ description: 'Machine ID' })
  @IsUUID()
  @IsOptional()
  machineId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;
}

// ============================================================================
// TIME OFF DTOs
// ============================================================================

export class CreateTimeOffRequestDto {
  @ApiProperty({ enum: TimeOffType })
  @IsEnum(TimeOffType)
  timeOffType: TimeOffType;

  @ApiProperty({ description: 'Start date' })
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @ApiProperty({ description: 'End date' })
  @IsDate()
  @Type(() => Date)
  endDate: Date;

  @ApiPropertyOptional({ description: 'Is half day start' })
  @IsBoolean()
  @IsOptional()
  halfDayStart?: boolean = false;

  @ApiPropertyOptional({ description: 'Is half day end' })
  @IsBoolean()
  @IsOptional()
  halfDayEnd?: boolean = false;

  @ApiPropertyOptional({ description: 'Reason' })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ description: 'Supporting document URLs' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  documents?: string[];
}

export class UpdateTimeOffRequestDto extends PartialType(CreateTimeOffRequestDto) {}

export class ApproveTimeOffDto {
  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class RejectTimeOffDto {
  @ApiProperty({ description: 'Rejection reason' })
  @IsString()
  reason: string;
}

export class TimeOffQueryDto {
  @ApiPropertyOptional({ description: 'Employee ID' })
  @IsUUID()
  @IsOptional()
  employeeId?: string;

  @ApiPropertyOptional({ enum: TimeOffType })
  @IsEnum(TimeOffType)
  @IsOptional()
  timeOffType?: TimeOffType;

  @ApiPropertyOptional({ enum: TimeOffStatus })
  @IsEnum(TimeOffStatus)
  @IsOptional()
  status?: TimeOffStatus;

  @ApiPropertyOptional({ description: 'Start date' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @ApiPropertyOptional({ description: 'End date' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;
}

// ============================================================================
// TIMESHEET DTOs
// ============================================================================

export class CreateTimesheetDto {
  @ApiProperty({ description: 'Employee ID' })
  @IsUUID()
  employeeId: string;

  @ApiProperty({ description: 'Period start date' })
  @IsDate()
  @Type(() => Date)
  periodStart: Date;

  @ApiProperty({ description: 'Period end date' })
  @IsDate()
  @Type(() => Date)
  periodEnd: Date;
}

export class ApproveTimesheetDto {
  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Deductions' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  deductions?: number;
}

export class TimesheetQueryDto {
  @ApiPropertyOptional({ description: 'Employee ID' })
  @IsUUID()
  @IsOptional()
  employeeId?: string;

  @ApiPropertyOptional({ description: 'Status' })
  @IsEnum(['draft', 'submitted', 'approved', 'rejected', 'paid'])
  @IsOptional()
  status?: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';

  @ApiPropertyOptional({ description: 'Period start from' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  periodStartFrom?: Date;

  @ApiPropertyOptional({ description: 'Period start to' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  periodStartTo?: Date;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export class WorkLogStatsDto {
  @ApiProperty()
  totalWorkedHours: number;

  @ApiProperty()
  totalOvertimeHours: number;

  @ApiProperty()
  totalDays: number;

  @ApiProperty()
  averageHoursPerDay: number;

  @ApiProperty()
  byActivity: Record<ActivityType, number>;

  @ApiProperty()
  byStatus: Record<WorkLogStatus, number>;
}

export class EmployeeAttendanceDto {
  @ApiProperty()
  employeeId: string;

  @ApiProperty()
  employeeName: string;

  @ApiProperty()
  presentDays: number;

  @ApiProperty()
  absentDays: number;

  @ApiProperty()
  lateDays: number;

  @ApiProperty()
  timeOffDays: number;

  @ApiProperty()
  totalWorkedHours: number;

  @ApiProperty()
  overtimeHours: number;
}
