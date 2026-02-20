/**
 * Contractor DTOs
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
  IsBoolean,
  IsArray,
  MaxLength,
  Min,
  Max,
  IsInt,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ServiceType, InvoiceStatus } from '../entities/contractor.entity';

// ============================================================================
// BANK DETAILS DTO
// ============================================================================

export class BankDetailsDto {
  @ApiProperty({ description: 'Bank name' })
  @IsString()
  @MaxLength(255)
  bankName: string;

  @ApiProperty({ description: 'Account number' })
  @IsString()
  @MaxLength(50)
  accountNumber: string;

  @ApiPropertyOptional({ description: 'MFO code' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  mfo?: string;

  @ApiPropertyOptional({ description: 'INN' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  inn?: string;

  @ApiPropertyOptional({ description: 'OKED' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  oked?: string;
}

// ============================================================================
// CONTRACTOR DTOs
// ============================================================================

export class CreateContractorDto {
  @ApiProperty({ description: 'Company name' })
  @IsString()
  @MaxLength(255)
  companyName: string;

  @ApiPropertyOptional({ description: 'Contact person' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  contactPerson?: string;

  @ApiPropertyOptional({ description: 'Phone' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ description: 'Email' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ description: 'Address' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiProperty({ description: 'Service type', enum: ServiceType })
  @IsEnum(ServiceType)
  serviceType: ServiceType;

  @ApiPropertyOptional({ description: 'Contract start date' })
  @IsOptional()
  @IsDateString()
  contractStart?: string;

  @ApiPropertyOptional({ description: 'Contract end date' })
  @IsOptional()
  @IsDateString()
  contractEnd?: string;

  @ApiPropertyOptional({ description: 'Contract number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  contractNumber?: string;

  @ApiPropertyOptional({ description: 'Payment terms' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  paymentTerms?: string;

  @ApiPropertyOptional({ description: 'Bank details' })
  @IsOptional()
  @ValidateNested()
  @Type(() => BankDetailsDto)
  bankDetails?: BankDetailsDto;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateContractorDto {
  @ApiPropertyOptional({ description: 'Company name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyName?: string;

  @ApiPropertyOptional({ description: 'Contact person' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  contactPerson?: string;

  @ApiPropertyOptional({ description: 'Phone' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ description: 'Email' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ description: 'Address' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ description: 'Service type', enum: ServiceType })
  @IsOptional()
  @IsEnum(ServiceType)
  serviceType?: ServiceType;

  @ApiPropertyOptional({ description: 'Contract start date' })
  @IsOptional()
  @IsDateString()
  contractStart?: string;

  @ApiPropertyOptional({ description: 'Contract end date' })
  @IsOptional()
  @IsDateString()
  contractEnd?: string;

  @ApiPropertyOptional({ description: 'Contract number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  contractNumber?: string;

  @ApiPropertyOptional({ description: 'Payment terms' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  paymentTerms?: string;

  @ApiPropertyOptional({ description: 'Rating (1-5)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Bank details' })
  @IsOptional()
  @ValidateNested()
  @Type(() => BankDetailsDto)
  bankDetails?: BankDetailsDto;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

// ============================================================================
// INVOICE DTOs
// ============================================================================

export class CreateInvoiceDto {
  @ApiProperty({ description: 'Invoice number' })
  @IsString()
  @MaxLength(100)
  invoiceNumber: string;

  @ApiProperty({ description: 'Amount' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: 'Issue date' })
  @IsDateString()
  issueDate: string;

  @ApiProperty({ description: 'Due date' })
  @IsDateString()
  dueDate: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: 'Attachment URLs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentUrls?: string[];
}

export class UpdateInvoiceDto {
  @ApiPropertyOptional({ description: 'Amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ description: 'Due date' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: 'Attachment URLs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentUrls?: string[];
}

export class RecordInvoicePaymentDto {
  @ApiProperty({ description: 'Payment amount' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ description: 'Payment date' })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

// ============================================================================
// FILTER DTOs
// ============================================================================

export class ContractorFilterDto {
  @ApiPropertyOptional({ description: 'Service type', enum: ServiceType })
  @IsOptional()
  @IsEnum(ServiceType)
  serviceType?: ServiceType;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

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

export class InvoiceFilterDto {
  @ApiPropertyOptional({ description: 'Status', enum: InvoiceStatus })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional({ description: 'Contractor ID' })
  @IsOptional()
  @IsUUID()
  contractorId?: string;

  @ApiPropertyOptional({ description: 'From date' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'To date' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

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

export class ContractorDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  companyName: string;

  @ApiPropertyOptional()
  contactPerson?: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  address?: string;

  @ApiProperty({ enum: ServiceType })
  serviceType: ServiceType;

  @ApiPropertyOptional()
  contractStart?: Date;

  @ApiPropertyOptional()
  contractEnd?: Date;

  @ApiPropertyOptional()
  contractNumber?: string;

  @ApiPropertyOptional()
  paymentTerms?: string;

  @ApiPropertyOptional()
  rating?: number;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  bankDetails?: BankDetailsDto;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ContractorListDto {
  @ApiProperty({ type: [ContractorDto] })
  items: ContractorDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class InvoiceDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  contractorId: string;

  @ApiPropertyOptional()
  contractorName?: string;

  @ApiProperty()
  invoiceNumber: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  paidAmount: number;

  @ApiProperty({ enum: InvoiceStatus })
  status: InvoiceStatus;

  @ApiProperty()
  issueDate: Date;

  @ApiProperty()
  dueDate: Date;

  @ApiPropertyOptional()
  paidDate?: Date;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  approvedBy?: string;

  @ApiPropertyOptional()
  approvedAt?: Date;

  @ApiPropertyOptional()
  attachmentUrls?: string[];

  @ApiProperty()
  createdAt: Date;
}

export class InvoiceListDto {
  @ApiProperty({ type: [InvoiceDto] })
  items: InvoiceDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class ContractorStatsDto {
  @ApiProperty()
  totalContractors: number;

  @ApiProperty()
  activeContractors: number;

  @ApiProperty()
  byServiceType: Record<string, number>;

  @ApiProperty()
  totalInvoices: number;

  @ApiProperty()
  pendingInvoices: number;

  @ApiProperty()
  overdueInvoices: number;

  @ApiProperty()
  totalInvoiceAmount: number;

  @ApiProperty()
  paidAmount: number;

  @ApiProperty()
  unpaidAmount: number;
}
