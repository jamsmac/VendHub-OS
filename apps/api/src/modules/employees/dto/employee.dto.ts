/**
 * Employee DTOs
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
  IsEmail,
  MaxLength,
  Min,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  EmployeeRole,
  EmployeeStatus,
  SalaryFrequency,
} from '../entities/employee.entity';

// ============================================================================
// CREATE & UPDATE DTOs
// ============================================================================

export class CreateEmployeeDto {
  @ApiProperty({ description: 'First name' })
  @IsString()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ description: 'Last name' })
  @IsString()
  @MaxLength(100)
  lastName: string;

  @ApiPropertyOptional({ description: 'Middle name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  middleName?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiProperty({ description: 'Employee role', enum: EmployeeRole })
  @IsEnum(EmployeeRole)
  employeeRole: EmployeeRole;

  @ApiProperty({ description: 'Hire date' })
  @IsDateString()
  hireDate: string;

  @ApiPropertyOptional({ description: 'Salary amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salary?: number;

  @ApiPropertyOptional({ description: 'Salary frequency', enum: SalaryFrequency })
  @IsOptional()
  @IsEnum(SalaryFrequency)
  salaryFrequency?: SalaryFrequency;

  @ApiPropertyOptional({ description: 'Telegram user ID' })
  @IsOptional()
  @IsString()
  telegramUserId?: string;

  @ApiPropertyOptional({ description: 'Telegram username' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  telegramUsername?: string;

  @ApiPropertyOptional({ description: 'Address' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'District' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @ApiPropertyOptional({ description: 'Emergency contact name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  emergencyContactName?: string;

  @ApiPropertyOptional({ description: 'Emergency contact phone' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  emergencyContactPhone?: string;

  @ApiPropertyOptional({ description: 'Emergency contact relation' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  emergencyContactRelation?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateEmployeeDto {
  @ApiPropertyOptional({ description: 'First name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ description: 'Middle name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  middleName?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ description: 'Employee role', enum: EmployeeRole })
  @IsOptional()
  @IsEnum(EmployeeRole)
  employeeRole?: EmployeeRole;

  @ApiPropertyOptional({ description: 'Employee status', enum: EmployeeStatus })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @ApiPropertyOptional({ description: 'Salary amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salary?: number;

  @ApiPropertyOptional({ description: 'Salary frequency', enum: SalaryFrequency })
  @IsOptional()
  @IsEnum(SalaryFrequency)
  salaryFrequency?: SalaryFrequency;

  @ApiPropertyOptional({ description: 'Telegram user ID' })
  @IsOptional()
  @IsString()
  telegramUserId?: string;

  @ApiPropertyOptional({ description: 'Telegram username' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  telegramUsername?: string;

  @ApiPropertyOptional({ description: 'Address' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'District' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @ApiPropertyOptional({ description: 'Emergency contact name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  emergencyContactName?: string;

  @ApiPropertyOptional({ description: 'Emergency contact phone' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  emergencyContactPhone?: string;

  @ApiPropertyOptional({ description: 'Emergency contact relation' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  emergencyContactRelation?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

// ============================================================================
// ACTION DTOs
// ============================================================================

export class TerminateEmployeeDto {
  @ApiProperty({ description: 'Termination date' })
  @IsDateString()
  terminationDate: string;

  @ApiPropertyOptional({ description: 'Termination reason' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class LinkUserDto {
  @ApiProperty({ description: 'User ID to link' })
  @IsUUID()
  userId: string;
}

// ============================================================================
// FILTER DTOs
// ============================================================================

export class EmployeeFilterDto {
  @ApiPropertyOptional({ description: 'Employee role', enum: EmployeeRole })
  @IsOptional()
  @IsEnum(EmployeeRole)
  role?: EmployeeRole;

  @ApiPropertyOptional({ description: 'Employee status', enum: EmployeeStatus })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @ApiPropertyOptional({ description: 'Search query' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

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
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export class EmployeeDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiPropertyOptional()
  userId?: string;

  @ApiProperty()
  employeeNumber: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiPropertyOptional()
  middleName?: string;

  @ApiProperty()
  fullName: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiProperty({ enum: EmployeeRole })
  employeeRole: EmployeeRole;

  @ApiProperty({ enum: EmployeeStatus })
  status: EmployeeStatus;

  @ApiPropertyOptional()
  telegramUserId?: string;

  @ApiPropertyOptional()
  telegramUsername?: string;

  @ApiProperty()
  hireDate: Date;

  @ApiPropertyOptional()
  terminationDate?: Date;

  @ApiPropertyOptional()
  terminationReason?: string;

  @ApiPropertyOptional()
  salary?: number;

  @ApiPropertyOptional({ enum: SalaryFrequency })
  salaryFrequency?: SalaryFrequency;

  @ApiPropertyOptional()
  address?: string;

  @ApiPropertyOptional()
  city?: string;

  @ApiPropertyOptional()
  district?: string;

  @ApiPropertyOptional()
  emergencyContactName?: string;

  @ApiPropertyOptional()
  emergencyContactPhone?: string;

  @ApiPropertyOptional()
  emergencyContactRelation?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class EmployeeListDto {
  @ApiProperty({ type: [EmployeeDto] })
  items: EmployeeDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class EmployeeStatsDto {
  @ApiProperty()
  totalEmployees: number;

  @ApiProperty()
  activeCount: number;

  @ApiProperty()
  onLeaveCount: number;

  @ApiProperty()
  suspendedCount: number;

  @ApiProperty()
  terminatedCount: number;

  @ApiProperty()
  byRole: Record<string, number>;

  @ApiProperty()
  hiredThisMonth: number;

  @ApiProperty()
  terminatedThisMonth: number;
}
