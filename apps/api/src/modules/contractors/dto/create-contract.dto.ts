/**
 * Contract DTOs
 * Create and Update DTOs for contract management
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsNumber,
  IsUUID,
  IsInt,
  IsArray,
  MaxLength,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CommissionType, ContractStatus } from '../entities/contract.entity';

// ============================================================================
// COMMISSION TIER DTO
// ============================================================================

export class CommissionTierDto {
  @ApiProperty({ description: 'Minimum revenue for this tier' })
  @IsNumber()
  @Min(0)
  minRevenue: number;

  @ApiPropertyOptional({ description: 'Maximum revenue for this tier (null = unlimited)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxRevenue: number | null;

  @ApiProperty({ description: 'Commission rate percentage for this tier' })
  @IsNumber()
  @Min(0)
  @Max(100)
  rate: number;
}

// ============================================================================
// CREATE CONTRACT DTO
// ============================================================================

export class CreateContractDto {
  @ApiProperty({ description: 'Contractor ID' })
  @IsUUID()
  contractorId: string;

  @ApiProperty({ description: 'Contract number (unique)', maxLength: 50 })
  @IsString()
  @MaxLength(50)
  contractNumber: string;

  @ApiProperty({ description: 'Contract start date' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ description: 'Contract end date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ description: 'Commission type', enum: CommissionType })
  @IsEnum(CommissionType)
  commissionType: CommissionType;

  @ApiPropertyOptional({ description: 'Commission rate percentage (for PERCENTAGE type)', example: 15.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;

  @ApiPropertyOptional({ description: 'Fixed commission amount (for FIXED type)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  commissionFixedAmount?: number;

  @ApiPropertyOptional({ description: 'Fixed commission period: monthly, quarterly', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  commissionFixedPeriod?: string;

  @ApiPropertyOptional({ description: 'Commission tiers (for TIERED type)', type: [CommissionTierDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommissionTierDto)
  commissionTiers?: CommissionTierDto[];

  @ApiPropertyOptional({ description: 'Hybrid fixed amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  commissionHybridFixed?: number;

  @ApiPropertyOptional({ description: 'Hybrid commission rate percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionHybridRate?: number;

  @ApiPropertyOptional({ description: 'Currency (ISO 4217)', default: 'UZS', maxLength: 3 })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ description: 'Payment term in days', default: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  paymentTermDays?: number;

  @ApiPropertyOptional({ description: 'Payment type: prepaid, postpaid', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentType?: string;

  @ApiPropertyOptional({ description: 'Minimum monthly revenue' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumMonthlyRevenue?: number;

  @ApiPropertyOptional({ description: 'Penalty rate percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  penaltyRate?: number;

  @ApiPropertyOptional({ description: 'Special conditions' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  specialConditions?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Contract file attachment ID' })
  @IsOptional()
  @IsUUID()
  contractFileId?: string;
}

// ============================================================================
// UPDATE CONTRACT DTO
// ============================================================================

export class UpdateContractDto {
  @ApiPropertyOptional({ description: 'Contract end date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Commission type', enum: CommissionType })
  @IsOptional()
  @IsEnum(CommissionType)
  commissionType?: CommissionType;

  @ApiPropertyOptional({ description: 'Commission rate percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;

  @ApiPropertyOptional({ description: 'Fixed commission amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  commissionFixedAmount?: number;

  @ApiPropertyOptional({ description: 'Fixed commission period: monthly, quarterly', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  commissionFixedPeriod?: string;

  @ApiPropertyOptional({ description: 'Commission tiers', type: [CommissionTierDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommissionTierDto)
  commissionTiers?: CommissionTierDto[];

  @ApiPropertyOptional({ description: 'Hybrid fixed amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  commissionHybridFixed?: number;

  @ApiPropertyOptional({ description: 'Hybrid commission rate percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionHybridRate?: number;

  @ApiPropertyOptional({ description: 'Currency (ISO 4217)', maxLength: 3 })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ description: 'Payment term in days' })
  @IsOptional()
  @IsInt()
  @Min(1)
  paymentTermDays?: number;

  @ApiPropertyOptional({ description: 'Payment type: prepaid, postpaid', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentType?: string;

  @ApiPropertyOptional({ description: 'Minimum monthly revenue' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumMonthlyRevenue?: number;

  @ApiPropertyOptional({ description: 'Penalty rate percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  penaltyRate?: number;

  @ApiPropertyOptional({ description: 'Special conditions' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  specialConditions?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Contract file attachment ID' })
  @IsOptional()
  @IsUUID()
  contractFileId?: string;
}
