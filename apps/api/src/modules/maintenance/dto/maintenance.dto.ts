/**
 * Maintenance Module DTOs
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
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import {
  MaintenanceType,
  MaintenanceStatus,
  MaintenancePriority,
  WorkType,
} from '../entities/maintenance.entity';

// ============================================================================
// MAINTENANCE REQUEST DTOs
// ============================================================================

export class CreateMaintenanceRequestDto {
  @ApiProperty({ enum: MaintenanceType })
  @IsEnum(MaintenanceType)
  maintenanceType: MaintenanceType;

  @ApiProperty({ enum: MaintenancePriority, default: MaintenancePriority.NORMAL })
  @IsEnum(MaintenancePriority)
  @IsOptional()
  priority?: MaintenancePriority = MaintenancePriority.NORMAL;

  @ApiProperty({ description: 'Machine ID' })
  @IsUUID()
  machineId: string;

  @ApiProperty({ description: 'Issue title' })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ description: 'Detailed description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Symptoms observed' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  symptoms?: string[];

  @ApiPropertyOptional({ description: 'Error codes from machine' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  errorCodes?: string[];

  @ApiPropertyOptional({ description: 'Assigned technician ID' })
  @IsUUID()
  @IsOptional()
  assignedTechnicianId?: string;

  @ApiPropertyOptional({ description: 'Scheduled date' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  scheduledDate?: Date;

  @ApiPropertyOptional({ description: 'Estimated duration in minutes' })
  @IsInt()
  @Min(1)
  @IsOptional()
  estimatedDuration?: number;

  @ApiPropertyOptional({ description: 'Estimated cost' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  estimatedCost?: number;

  @ApiPropertyOptional({ description: 'Related task ID' })
  @IsUUID()
  @IsOptional()
  relatedTaskId?: string;

  @ApiPropertyOptional({ description: 'Maintenance schedule ID' })
  @IsUUID()
  @IsOptional()
  maintenanceScheduleId?: string;

  @ApiPropertyOptional({ description: 'Machine downtime start' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  downtimeStart?: Date;
}

export class UpdateMaintenanceRequestDto extends PartialType(CreateMaintenanceRequestDto) {}

export class SubmitMaintenanceRequestDto {
  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class ApproveMaintenanceRequestDto {
  @ApiPropertyOptional({ description: 'Approval notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Override estimated cost' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  estimatedCost?: number;
}

export class RejectMaintenanceRequestDto {
  @ApiProperty({ description: 'Rejection reason' })
  @IsString()
  reason: string;
}

export class AssignTechnicianDto {
  @ApiProperty({ description: 'Technician ID' })
  @IsUUID()
  technicianId: string;

  @ApiPropertyOptional({ description: 'Scheduled date' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  scheduledDate?: Date;
}

export class StartMaintenanceDto {
  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Machine downtime start' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  downtimeStart?: Date;
}

export class CompleteMaintenanceDto {
  @ApiPropertyOptional({ description: 'Completion notes' })
  @IsString()
  @IsOptional()
  completionNotes?: string;

  @ApiPropertyOptional({ description: 'Root cause analysis' })
  @IsString()
  @IsOptional()
  rootCause?: string;

  @ApiPropertyOptional({ description: 'Actions taken' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  actionsTaken?: string[];

  @ApiPropertyOptional({ description: 'Recommendations' })
  @IsString()
  @IsOptional()
  recommendations?: string;

  @ApiPropertyOptional({ description: 'Machine downtime end' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  downtimeEnd?: Date;
}

export class VerifyMaintenanceDto {
  @ApiProperty({ description: 'Verification passed' })
  @IsBoolean()
  passed: boolean;

  @ApiPropertyOptional({ description: 'Verification notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class MaintenanceQueryDto {
  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsEnum(MaintenanceStatus)
  @IsOptional()
  status?: MaintenanceStatus;

  @ApiPropertyOptional({ description: 'Filter by multiple statuses' })
  @IsArray()
  @IsEnum(MaintenanceStatus, { each: true })
  @IsOptional()
  statuses?: MaintenanceStatus[];

  @ApiPropertyOptional({ description: 'Filter by type' })
  @IsEnum(MaintenanceType)
  @IsOptional()
  maintenanceType?: MaintenanceType;

  @ApiPropertyOptional({ description: 'Filter by priority' })
  @IsEnum(MaintenancePriority)
  @IsOptional()
  priority?: MaintenancePriority;

  @ApiPropertyOptional({ description: 'Filter by machine ID' })
  @IsUUID()
  @IsOptional()
  machineId?: string;

  @ApiPropertyOptional({ description: 'Filter by technician ID' })
  @IsUUID()
  @IsOptional()
  technicianId?: string;

  @ApiPropertyOptional({ description: 'Filter by creator ID' })
  @IsUUID()
  @IsOptional()
  createdByUserId?: string;

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

  @ApiPropertyOptional({ description: 'Only overdue' })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  overdueOnly?: boolean;

  @ApiPropertyOptional({ description: 'Only SLA breached' })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  slaBreachedOnly?: boolean;

  @ApiPropertyOptional({ description: 'Search term' })
  @IsString()
  @IsOptional()
  search?: string;

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

  @ApiPropertyOptional({ description: 'Sort by field' })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort direction' })
  @IsEnum(['ASC', 'DESC'])
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

// ============================================================================
// MAINTENANCE PART DTOs
// ============================================================================

export class CreateMaintenancePartDto {
  @ApiProperty({ description: 'Product/Part ID' })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'Part name' })
  @IsString()
  @MaxLength(255)
  partName: string;

  @ApiPropertyOptional({ description: 'Part number/SKU' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  partNumber?: string;

  @ApiProperty({ description: 'Quantity needed' })
  @IsNumber()
  @Min(0.001)
  quantityNeeded: number;

  @ApiProperty({ description: 'Unit price' })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateMaintenancePartDto {
  @ApiPropertyOptional({ description: 'Quantity used' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  quantityUsed?: number;

  @ApiPropertyOptional({ description: 'Status' })
  @IsEnum(['pending', 'ordered', 'received', 'installed', 'returned'])
  @IsOptional()
  status?: 'pending' | 'ordered' | 'received' | 'installed' | 'returned';

  @ApiPropertyOptional({ description: 'Serial number of installed part' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  serialNumber?: string;

  @ApiPropertyOptional({ description: 'Old part serial number' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  oldSerialNumber?: string;

  @ApiPropertyOptional({ description: 'Warranty until' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  warrantyUntil?: Date;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

// ============================================================================
// MAINTENANCE WORK LOG DTOs
// ============================================================================

export class CreateMaintenanceWorkLogDto {
  @ApiProperty({ enum: WorkType })
  @IsEnum(WorkType)
  workType: WorkType;

  @ApiProperty({ description: 'Work date' })
  @IsDate()
  @Type(() => Date)
  workDate: Date;

  @ApiProperty({ description: 'Start time (HH:mm)' })
  @IsString()
  startTime: string;

  @ApiProperty({ description: 'End time (HH:mm)' })
  @IsString()
  endTime: string;

  @ApiProperty({ description: 'Work description' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Hourly rate' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  hourlyRate?: number;

  @ApiPropertyOptional({ description: 'Is billable' })
  @IsBoolean()
  @IsOptional()
  isBillable?: boolean = true;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateMaintenanceWorkLogDto extends PartialType(CreateMaintenanceWorkLogDto) {}

// ============================================================================
// MAINTENANCE SCHEDULE DTOs
// ============================================================================

export class CreateMaintenanceScheduleDto {
  @ApiProperty({ description: 'Schedule name' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: MaintenanceType })
  @IsEnum(MaintenanceType)
  maintenanceType: MaintenanceType;

  @ApiPropertyOptional({ description: 'Specific machine ID' })
  @IsUUID()
  @IsOptional()
  machineId?: string;

  @ApiPropertyOptional({ description: 'Machine model filter' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  machineModel?: string;

  @ApiProperty({ description: 'Frequency type' })
  @IsEnum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'hours', 'sales'])
  frequencyType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'hours' | 'sales';

  @ApiProperty({ description: 'Frequency value' })
  @IsInt()
  @Min(1)
  frequencyValue: number;

  @ApiPropertyOptional({ description: 'Days of week (0-6)' })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  daysOfWeek?: number[];

  @ApiPropertyOptional({ description: 'Day of month (1-31)' })
  @IsInt()
  @Min(1)
  @Max(31)
  @IsOptional()
  dayOfMonth?: number;

  @ApiPropertyOptional({ description: 'Next due date' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  nextDueDate?: Date;

  @ApiPropertyOptional({ description: 'Checklist template' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  @IsOptional()
  checklistTemplate?: ChecklistItemDto[];

  @ApiPropertyOptional({ description: 'Estimated duration in minutes' })
  @IsInt()
  @Min(1)
  @IsOptional()
  estimatedDuration?: number;

  @ApiPropertyOptional({ description: 'Estimated cost' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  estimatedCost?: number;

  @ApiPropertyOptional({ description: 'Days before to notify', default: 7 })
  @IsInt()
  @Min(1)
  @IsOptional()
  notifyDaysBefore?: number = 7;

  @ApiPropertyOptional({ description: 'Auto-create request' })
  @IsBoolean()
  @IsOptional()
  autoCreateRequest?: boolean = false;
}

export class ChecklistItemDto {
  @ApiProperty({ description: 'Item description' })
  @IsString()
  item: string;

  @ApiProperty({ description: 'Is required' })
  @IsBoolean()
  required: boolean;
}

export class UpdateMaintenanceScheduleDto extends PartialType(CreateMaintenanceScheduleDto) {
  @ApiPropertyOptional({ description: 'Is active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class ScheduleQueryDto {
  @ApiPropertyOptional({ description: 'Filter by machine ID' })
  @IsUUID()
  @IsOptional()
  machineId?: string;

  @ApiPropertyOptional({ description: 'Filter by type' })
  @IsEnum(MaintenanceType)
  @IsOptional()
  maintenanceType?: MaintenanceType;

  @ApiPropertyOptional({ description: 'Only active' })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  activeOnly?: boolean = true;

  @ApiPropertyOptional({ description: 'Due within days' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  dueWithinDays?: number;

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

export class MaintenanceStatsDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  byStatus: Record<MaintenanceStatus, number>;

  @ApiProperty()
  byType: Record<MaintenanceType, number>;

  @ApiProperty()
  byPriority: Record<MaintenancePriority, number>;

  @ApiProperty()
  overdue: number;

  @ApiProperty()
  slaBreached: number;

  @ApiProperty()
  avgCompletionTime: number;

  @ApiProperty()
  totalCost: number;

  @ApiProperty()
  totalDowntimeMinutes: number;
}
