/**
 * Leave Request DTOs
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsDateString,
  IsInt,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LeaveType, LeaveStatus } from '../entities/leave-request.entity';

// ============================================================================
// CREATE & ACTION DTOs
// ============================================================================

export class CreateLeaveRequestDto {
  @ApiProperty({ description: 'Employee ID' })
  @IsUUID()
  employeeId: string;

  @ApiProperty({ description: 'Leave type', enum: LeaveType })
  @IsEnum(LeaveType)
  leaveType: LeaveType;

  @ApiProperty({ description: 'Start date (ISO format)' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'End date (ISO format)' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'Reason for leave' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

export class RejectLeaveDto {
  @ApiProperty({ description: 'Rejection reason' })
  @IsString()
  @MaxLength(1000)
  reason: string;
}

// ============================================================================
// QUERY DTOs
// ============================================================================

export class QueryLeaveRequestsDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filter by employee ID' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({ description: 'Filter by status', enum: LeaveStatus })
  @IsOptional()
  @IsEnum(LeaveStatus)
  status?: LeaveStatus;

  @ApiPropertyOptional({ description: 'Filter by leave type', enum: LeaveType })
  @IsOptional()
  @IsEnum(LeaveType)
  leaveType?: LeaveType;

  @ApiPropertyOptional({ description: 'Date from (ISO format)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Date to (ISO format)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export class LeaveRequestDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  employeeId: string;

  @ApiProperty({ enum: LeaveType })
  leaveType: LeaveType;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty()
  totalDays: number;

  @ApiPropertyOptional()
  reason?: string | null;

  @ApiProperty({ enum: LeaveStatus })
  status: LeaveStatus;

  @ApiPropertyOptional()
  approvedById?: string | null;

  @ApiPropertyOptional()
  approvedAt?: Date | null;

  @ApiPropertyOptional()
  rejectionReason?: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class LeaveRequestListDto {
  @ApiProperty({ type: [LeaveRequestDto] })
  items: LeaveRequestDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class LeaveBalanceDto {
  @ApiProperty()
  employeeId: string;

  @ApiProperty()
  annualTotal: number;

  @ApiProperty()
  annualUsed: number;

  @ApiProperty()
  annualRemaining: number;

  @ApiProperty()
  sickTotal: number;

  @ApiProperty()
  sickUsed: number;

  @ApiProperty()
  sickRemaining: number;

  @ApiProperty()
  year: number;
}
