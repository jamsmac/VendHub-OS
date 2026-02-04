/**
 * Attendance DTOs
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsDateString,
  IsObject,
  IsInt,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus } from '../entities/attendance.entity';

// ============================================================================
// ACTION DTOs
// ============================================================================

export class CheckInDto {
  @ApiProperty({ description: 'Employee ID' })
  @IsUUID()
  employeeId: string;

  @ApiPropertyOptional({ description: 'Check-in note' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @ApiPropertyOptional({ description: 'Check-in location {lat, lng}' })
  @IsOptional()
  @IsObject()
  location?: Record<string, any>;
}

export class CheckOutDto {
  @ApiProperty({ description: 'Employee ID' })
  @IsUUID()
  employeeId: string;

  @ApiPropertyOptional({ description: 'Check-out note' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @ApiPropertyOptional({ description: 'Check-out location {lat, lng}' })
  @IsOptional()
  @IsObject()
  location?: Record<string, any>;
}

// ============================================================================
// QUERY DTOs
// ============================================================================

export class QueryAttendanceDto {
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

  @ApiPropertyOptional({ description: 'Date from (ISO format)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Date to (ISO format)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Filter by status', enum: AttendanceStatus })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export class AttendanceDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  employeeId: string;

  @ApiProperty()
  date: Date;

  @ApiPropertyOptional()
  checkIn?: Date | null;

  @ApiPropertyOptional()
  checkOut?: Date | null;

  @ApiPropertyOptional()
  totalHours?: number | null;

  @ApiPropertyOptional()
  overtimeHours?: number | null;

  @ApiProperty({ enum: AttendanceStatus })
  status: AttendanceStatus;

  @ApiPropertyOptional()
  note?: string | null;

  @ApiPropertyOptional()
  checkInLocation?: Record<string, any> | null;

  @ApiPropertyOptional()
  checkOutLocation?: Record<string, any> | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class AttendanceListDto {
  @ApiProperty({ type: [AttendanceDto] })
  items: AttendanceDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class DailyAttendanceReportDto {
  @ApiProperty()
  date: string;

  @ApiProperty()
  totalEmployees: number;

  @ApiProperty()
  presentCount: number;

  @ApiProperty()
  absentCount: number;

  @ApiProperty()
  lateCount: number;

  @ApiProperty()
  onLeaveCount: number;

  @ApiProperty({ type: [AttendanceDto] })
  records: AttendanceDto[];
}
