import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsUUID,
  IsObject,
  IsArray,
  IsDateString,
  Length,
  MaxLength,
  Min,
  Max,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import {
  CommissionType,
  ContractType,
  ContractStatus,
} from "../../../common/enums";

// ============================================================================
// NESTED JSONB DTOs
// ============================================================================

export class ContractCommissionTierDto {
  @ApiProperty({ example: 0, description: "Minimum amount for this tier" })
  @IsNumber()
  @Min(0)
  min_amount: number;

  @ApiProperty({
    example: 1000000,
    description: "Maximum amount for this tier",
  })
  @IsNumber()
  @Min(0)
  max_amount: number;

  @ApiProperty({ example: 5, description: "Commission rate percentage" })
  @IsNumber()
  @Min(0)
  @Max(100)
  rate: number;
}

export class ContractTerritoryDto {
  @ApiPropertyOptional({
    example: ["Tashkent"],
    description: "Allowed regions",
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  regions?: string[];

  @ApiPropertyOptional({
    example: ["Tashkent", "Samarkand"],
    description: "Allowed cities",
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cities?: string[];

  @ApiProperty({
    example: false,
    description: "Whether territory is exclusive",
  })
  @IsBoolean()
  is_exclusive: boolean;

  @ApiPropertyOptional({ example: 50, description: "Territory radius in km" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  radius?: number;

  @ApiPropertyOptional({
    example: 41.2995,
    description: "Territory center latitude",
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  center_lat?: number;

  @ApiPropertyOptional({
    example: 69.2401,
    description: "Territory center longitude",
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  center_lng?: number;
}

export class ContractContactPersonDto {
  @ApiProperty({
    example: "Alisher Karimov",
    description: "Contact person name",
  })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: "+998901234567", description: "Contact phone" })
  @IsString()
  @MaxLength(20)
  phone: string;

  @ApiProperty({ example: "contact@company.uz", description: "Contact email" })
  @IsString()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: "Director", description: "Contact position" })
  @IsString()
  @MaxLength(100)
  position: string;
}

export class ContractContactsDto {
  @ApiProperty({
    type: ContractContactPersonDto,
    description: "Primary contact",
  })
  @ValidateNested()
  @Type(() => ContractContactPersonDto)
  primary: ContractContactPersonDto;

  @ApiPropertyOptional({
    type: ContractContactPersonDto,
    description: "Secondary contact",
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContractContactPersonDto)
  secondary?: ContractContactPersonDto;
}

// ============================================================================
// CREATE ORGANIZATION CONTRACT DTO
// ============================================================================

export class CreateOrganizationContractDto {
  @ApiProperty({
    example: "uuid-of-organization",
    description: "Organization ID",
  })
  @IsUUID()
  organization_id: string;

  @ApiPropertyOptional({
    example: "uuid-of-counterparty",
    description: "Counterparty organization ID",
  })
  @IsOptional()
  @IsUUID()
  counterparty_id?: string;

  @ApiProperty({
    example: "CTR-2025-001",
    description: "Unique contract number",
    maxLength: 50,
  })
  @IsString()
  @Length(1, 50)
  contract_number: string;

  @ApiProperty({
    enum: ContractType,
    example: ContractType.FRANCHISE,
    description: "Type of contract",
  })
  @IsEnum(ContractType)
  contract_type: ContractType;

  @ApiPropertyOptional({
    enum: ContractStatus,
    default: ContractStatus.DRAFT,
    description: "Contract status",
  })
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;

  @ApiPropertyOptional({
    example: "Franchise agreement for Tashkent region",
    description: "Contract subject",
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  subject?: string;

  // Dates
  @ApiProperty({ example: "2025-01-01", description: "Contract start date" })
  @IsDateString()
  start_date: string;

  @ApiPropertyOptional({
    example: "2026-01-01",
    description: "Contract end date",
  })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({
    example: "2025-01-15",
    description: "Date contract was signed",
  })
  @IsOptional()
  @IsDateString()
  signed_date?: string;

  @ApiPropertyOptional({
    default: false,
    description: "Whether contract auto-renews",
  })
  @IsOptional()
  @IsBoolean()
  auto_renew?: boolean;

  @ApiPropertyOptional({ example: 12, description: "Renewal period in months" })
  @IsOptional()
  @IsNumber()
  @Min(1)
  renewal_period_months?: number;

  // Financial terms
  @ApiPropertyOptional({
    enum: CommissionType,
    example: CommissionType.PERCENTAGE,
    description: "Commission calculation type",
  })
  @IsOptional()
  @IsEnum(CommissionType)
  commission_type?: CommissionType;

  @ApiPropertyOptional({
    example: 10.5,
    description: "Commission rate percentage",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commission_rate?: number;

  @ApiPropertyOptional({
    example: 500000,
    description: "Fixed commission amount in UZS",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fixed_amount?: number;

  @ApiPropertyOptional({
    type: [ContractCommissionTierDto],
    description: "Tiered commission rates",
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContractCommissionTierDto)
  commission_tiers?: ContractCommissionTierDto[];

  @ApiPropertyOptional({
    example: 100000,
    description: "Minimum monthly fee in UZS",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimum_monthly_fee?: number;

  @ApiPropertyOptional({
    example: 5000000,
    description: "One-time franchise fee in UZS",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  franchise_fee?: number;

  @ApiPropertyOptional({
    example: 1000000,
    description: "Security deposit in UZS",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deposit?: number;

  @ApiPropertyOptional({
    example: 30,
    default: 30,
    description: "Payment term in days",
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  payment_term_days?: number;

  @ApiPropertyOptional({
    example: "UZS",
    default: "UZS",
    description: "Currency code",
    maxLength: 3,
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  // Territory
  @ApiPropertyOptional({
    type: ContractTerritoryDto,
    description: "Territory restrictions for exclusive franchise",
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContractTerritoryDto)
  territory?: ContractTerritoryDto;

  // Terms and conditions
  @ApiPropertyOptional({ description: "Contract terms and conditions text" })
  @IsOptional()
  @IsString()
  terms_and_conditions?: string;

  // Contacts
  @ApiPropertyOptional({
    type: ContractContactsDto,
    description: "Contract contact persons",
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContractContactsDto)
  contacts?: ContractContactsDto;

  // Notes
  @ApiPropertyOptional({ description: "Additional notes" })
  @IsOptional()
  @IsString()
  notes?: string;

  // Metadata
  @ApiPropertyOptional({ example: {}, description: "Additional metadata" })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
