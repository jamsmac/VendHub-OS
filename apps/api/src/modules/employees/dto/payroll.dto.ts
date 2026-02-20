/**
 * Payroll DTOs
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
import { PayrollStatus } from '../entities/payroll.entity';

// ============================================================================
// ACTION DTOs
// ============================================================================

export class CalculatePayrollDto {
  @ApiProperty({ description: 'Employee ID' })
  @IsUUID()
  employeeId: string;

  @ApiProperty({ description: 'Period start date (ISO format)' })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ description: 'Period end date (ISO format)' })
  @IsDateString()
  periodEnd: string;
}

// ============================================================================
// QUERY DTOs
// ============================================================================

export class QueryPayrollDto {
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

  @ApiPropertyOptional({ description: 'Filter by status', enum: PayrollStatus })
  @IsOptional()
  @IsEnum(PayrollStatus)
  status?: PayrollStatus;

  @ApiPropertyOptional({ description: 'Period start date (ISO format)' })
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @ApiPropertyOptional({ description: 'Period end date (ISO format)' })
  @IsOptional()
  @IsDateString()
  periodEnd?: string;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export class PayrollDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  employeeId: string;

  @ApiProperty()
  periodStart: Date;

  @ApiProperty()
  periodEnd: Date;

  @ApiProperty()
  baseSalary: number;

  @ApiProperty()
  overtimePay: number;

  @ApiProperty()
  bonuses: number;

  @ApiProperty()
  deductions: number;

  @ApiProperty()
  taxAmount: number;

  @ApiProperty()
  netSalary: number;

  @ApiProperty()
  currency: string;

  @ApiProperty({ enum: PayrollStatus })
  status: PayrollStatus;

  @ApiPropertyOptional()
  calculatedAt?: Date | null;

  @ApiPropertyOptional()
  approvedById?: string | null;

  @ApiPropertyOptional()
  approvedAt?: Date | null;

  @ApiPropertyOptional()
  paidAt?: Date | null;

  @ApiPropertyOptional()
  paymentReference?: string | null;

  @ApiProperty()
  workingDays: number;

  @ApiProperty()
  workedDays: number;

  @ApiProperty()
  overtimeHours: number;

  @ApiPropertyOptional()
  details?: Record<string, any> | null;

  @ApiPropertyOptional()
  note?: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PayrollListDto {
  @ApiProperty({ type: [PayrollDto] })
  items: PayrollDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
