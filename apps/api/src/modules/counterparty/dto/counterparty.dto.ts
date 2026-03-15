/**
 * Counterparty DTOs
 */

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsUUID,
  IsDate,
  MaxLength,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import {
  CounterpartyType,
  CommissionType,
} from "../entities/counterparty.entity";

// ============================================================================
// COUNTERPARTY DTOs
// ============================================================================

export class CreateCounterpartyDto {
  @ApiProperty({ description: "Company name" })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: "Short name" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  shortName?: string;

  @ApiProperty({ enum: CounterpartyType })
  @IsEnum(CounterpartyType)
  type: CounterpartyType;

  @ApiProperty({ description: "INN (tax ID)" })
  @IsString()
  @MaxLength(20)
  inn: string;

  @ApiPropertyOptional({ description: "OKED code" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  oked?: string;

  @ApiPropertyOptional({ description: "MFO (bank code)" })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  mfo?: string;

  @ApiPropertyOptional({ description: "Bank account number" })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  bankAccount?: string;

  @ApiPropertyOptional({ description: "Bank name" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  bankName?: string;

  @ApiPropertyOptional({ description: "Legal address" })
  @IsOptional()
  @IsString()
  legalAddress?: string;

  @ApiPropertyOptional({ description: "Actual address" })
  @IsOptional()
  @IsString()
  actualAddress?: string;

  @ApiPropertyOptional({ description: "Contact person" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactPerson?: string;

  @ApiPropertyOptional({ description: "Phone number" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ description: "Email" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ description: "Is VAT payer", default: true })
  @IsOptional()
  @IsBoolean()
  isVatPayer?: boolean;

  @ApiPropertyOptional({ description: "VAT rate (%)", default: 15 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  vatRate?: number;

  @ApiPropertyOptional({ description: "Payment term (days)", default: 30 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  paymentTermDays?: number;

  @ApiPropertyOptional({ description: "Credit limit (UZS)" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimit?: number;

  @ApiPropertyOptional({ description: "Notes" })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCounterpartyDto {
  @ApiPropertyOptional({ description: "Company name" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: "Short name" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  shortName?: string;

  @ApiPropertyOptional({ enum: CounterpartyType })
  @IsOptional()
  @IsEnum(CounterpartyType)
  type?: CounterpartyType;

  @ApiPropertyOptional({ description: "INN (tax ID)" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  inn?: string;

  @ApiPropertyOptional({ description: "Contact person" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactPerson?: string;

  @ApiPropertyOptional({ description: "Phone number" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ description: "Email" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ description: "Is active" })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: "Notes" })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ============================================================================
// CONTRACT DTOs
// ============================================================================

export class CreateContractDto {
  @ApiProperty({ description: "Contract number" })
  @IsString()
  @MaxLength(50)
  contractNumber: string;

  @ApiProperty({ description: "Start date" })
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @ApiPropertyOptional({ description: "End date" })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @ApiProperty({ description: "Counterparty ID" })
  @IsUUID()
  counterpartyId: string;

  @ApiProperty({ enum: CommissionType })
  @IsEnum(CommissionType)
  commissionType: CommissionType;

  @ApiPropertyOptional({ description: "Commission rate (%)" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  commissionRate?: number;

  @ApiPropertyOptional({ description: "Commission fixed amount (UZS)" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  commissionFixedAmount?: number;

  @ApiPropertyOptional({ description: "Payment term (days)" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  paymentTermDays?: number;

  @ApiPropertyOptional({ description: "Notes" })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ============================================================================
// QUERY DTOs
// ============================================================================

export class CounterpartyFilterDto {
  @ApiPropertyOptional({ enum: CounterpartyType })
  @IsOptional()
  @IsEnum(CounterpartyType)
  type?: CounterpartyType;

  @ApiPropertyOptional({ description: "Search by name or INN" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Active only", default: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  activeOnly?: boolean;
}
