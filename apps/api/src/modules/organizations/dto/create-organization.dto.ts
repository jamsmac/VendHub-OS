import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsUUID,
  IsEmail,
  IsObject,
  IsArray,
  Length,
  MaxLength,
  Min,
  Max,
  ValidateNested,
  IsDateString,
} from "class-validator";
import { Type } from "class-transformer";
import {
  OrganizationType,
  OrganizationStatus,
  SubscriptionTier,
} from "../entities/organization.entity";
import { CommissionType } from "../../../common/enums";

// ============================================================================
// NESTED JSONB DTOs
// ============================================================================

export class FiscalSettingsDto {
  @ApiPropertyOptional({ example: "TERM-001" })
  @IsOptional()
  @IsString()
  terminal_id?: string;

  @ApiPropertyOptional({ example: "secret123" })
  @IsOptional()
  @IsString()
  terminal_password?: string;

  @ApiPropertyOptional({ example: "CR-001" })
  @IsOptional()
  @IsString()
  cash_register_id?: string;

  @ApiPropertyOptional({ example: "soliq", description: "OFD provider name" })
  @IsOptional()
  @IsString()
  ofd_provider?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  auto_fiscalize?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  print_receipts?: boolean;
}

export class OrganizationLimitsDto {
  @ApiPropertyOptional({
    example: 10,
    description: "Maximum number of machines (0 = unlimited)",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  max_machines?: number;

  @ApiPropertyOptional({
    example: 5,
    description: "Maximum number of users (0 = unlimited)",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  max_users?: number;

  @ApiPropertyOptional({
    example: 200,
    description: "Maximum number of products (0 = unlimited)",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  max_products?: number;

  @ApiPropertyOptional({
    example: 10,
    description: "Maximum number of locations (0 = unlimited)",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  max_locations?: number;

  @ApiPropertyOptional({
    example: 10000,
    description: "Maximum transactions per month (0 = unlimited)",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  max_transactions_per_month?: number;

  @ApiPropertyOptional({
    example: 500,
    description: "Maximum storage in MB (0 = unlimited)",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  max_storage_mb?: number;

  @ApiPropertyOptional({
    example: ["basic_reports", "telegram_notifications"],
    description: "List of enabled features",
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];
}

export class WorkingHoursDto {
  @ApiPropertyOptional({ example: "09:00" })
  @IsOptional()
  @IsString()
  start?: string;

  @ApiPropertyOptional({ example: "18:00" })
  @IsOptional()
  @IsString()
  end?: string;

  @ApiPropertyOptional({
    example: [1, 2, 3, 4, 5],
    description: "Days of week (0=Sun, 6=Sat)",
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  days_of_week?: number[];
}

export class NotificationSettingsDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  telegram?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  sms?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  low_stock?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  machine_offline?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  task_overdue?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  daily_report?: boolean;
}

export class BrandingSettingsDto {
  @ApiPropertyOptional({ example: "#1E40AF" })
  @IsOptional()
  @IsString()
  primary_color?: string;

  @ApiPropertyOptional({ example: "#3B82F6" })
  @IsOptional()
  @IsString()
  secondary_color?: string;

  @ApiPropertyOptional({ example: "https://cdn.example.com/logo.png" })
  @IsOptional()
  @IsString()
  logo_url?: string;

  @ApiPropertyOptional({ example: "https://cdn.example.com/favicon.ico" })
  @IsOptional()
  @IsString()
  favicon_url?: string;
}

export class OrganizationSettingsDto {
  @ApiPropertyOptional({ example: "Asia/Tashkent", default: "Asia/Tashkent" })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example: "UZS", default: "UZS" })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ example: "ru", default: "ru" })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  language?: string;

  @ApiPropertyOptional({
    example: 12,
    description: "Default VAT rate percentage",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  default_vat_rate?: number;

  @ApiPropertyOptional({ example: "DD.MM.YYYY" })
  @IsOptional()
  @IsString()
  date_format?: string;

  @ApiPropertyOptional({ example: "HH:mm" })
  @IsOptional()
  @IsString()
  time_format?: string;

  @ApiPropertyOptional({ type: WorkingHoursDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkingHoursDto)
  working_hours?: WorkingHoursDto;

  @ApiPropertyOptional({ type: NotificationSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationSettingsDto)
  notifications?: NotificationSettingsDto;

  @ApiPropertyOptional({ type: BrandingSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BrandingSettingsDto)
  branding?: BrandingSettingsDto;
}

export class OrgCommissionTierDto {
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

  @ApiProperty({
    example: 5,
    description: "Commission rate percentage for this tier",
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  rate: number;
}

export class CommissionSettingsDto {
  @ApiProperty({ enum: CommissionType, example: CommissionType.PERCENTAGE })
  @IsEnum(CommissionType)
  type: CommissionType;

  @ApiPropertyOptional({
    example: 10,
    description: "Commission rate percentage",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  rate?: number;

  @ApiPropertyOptional({
    example: 50000,
    description: "Fixed commission amount in UZS",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fixed_amount?: number;

  @ApiPropertyOptional({
    type: [OrgCommissionTierDto],
    description: "Tiered commission rates",
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrgCommissionTierDto)
  tiers?: OrgCommissionTierDto[];

  @ApiPropertyOptional({ example: 30, description: "Payment term in days" })
  @IsOptional()
  @IsNumber()
  @Min(1)
  payment_term_days?: number;

  @ApiPropertyOptional({
    example: 100000,
    description: "Minimum monthly fee in UZS",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimum_monthly_fee?: number;
}

// ============================================================================
// MAIN CREATE ORGANIZATION DTO
// ============================================================================

export class CreateOrganizationDto {
  // Basic info
  @ApiProperty({
    example: "VendHub Tashkent",
    description: "Organization name",
    maxLength: 200,
  })
  @IsString()
  @Length(1, 200)
  name: string;

  @ApiPropertyOptional({
    example: "VendHub Toshkent",
    description: "Organization name in Uzbek",
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name_uz?: string;

  @ApiPropertyOptional({
    example: "vendhub-tashkent",
    description: "URL-friendly slug (auto-generated if not provided)",
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;

  @ApiPropertyOptional({
    example: "https://cdn.example.com/logo.png",
    description: "Logo URL",
  })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiPropertyOptional({
    example: "Vending machine operator in Tashkent",
    description: "Organization description",
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  // Type and hierarchy
  @ApiPropertyOptional({
    enum: OrganizationType,
    default: OrganizationType.OPERATOR,
    description: "Organization type",
  })
  @IsOptional()
  @IsEnum(OrganizationType)
  type?: OrganizationType;

  @ApiPropertyOptional({
    enum: OrganizationStatus,
    default: OrganizationStatus.PENDING,
    description: "Organization status",
  })
  @IsOptional()
  @IsEnum(OrganizationStatus)
  status?: OrganizationStatus;

  @ApiPropertyOptional({
    example: "uuid-of-parent-org",
    description: "Parent organization ID",
  })
  @IsOptional()
  @IsUUID()
  parent_id?: string;

  // Contact info
  @ApiPropertyOptional({
    example: "info@vendhub.com",
    description: "Contact email",
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: "+998901234567",
    description: "Primary phone number",
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    example: "+998901234568",
    description: "Secondary phone number",
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone_secondary?: string;

  @ApiPropertyOptional({
    example: "Tashkent, Amir Temur st. 1",
    description: "Physical address",
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    example: "Tashkent",
    description: "City",
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({
    example: "Tashkent",
    description: "Region/Province",
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;

  @ApiPropertyOptional({
    example: "100000",
    description: "Postal code",
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postal_code?: string;

  @ApiPropertyOptional({ example: 41.2995, description: "Latitude coordinate" })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    example: 69.2401,
    description: "Longitude coordinate",
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  // Legal info (Uzbekistan)
  @ApiPropertyOptional({
    example: "123456789",
    description: "Tax ID (INN)",
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  inn?: string;

  @ApiPropertyOptional({
    example: "12345678901234",
    description: "Personal ID (PINFL)",
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  pinfl?: string;

  @ApiPropertyOptional({
    example: "00084",
    description: "Bank code (MFO)",
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  mfo?: string;

  @ApiPropertyOptional({
    example: "20208000123456789001",
    description: "Bank account number",
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  bank_account?: string;

  @ApiPropertyOptional({
    example: "National Bank of Uzbekistan",
    description: "Bank name",
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  bank_name?: string;

  @ApiPropertyOptional({
    example: "52100",
    description: "Economic activity classifier (OKONX)",
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  okonx?: string;

  @ApiPropertyOptional({
    example: "Karimov Alisher Botirovich",
    description: "Director full name",
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  director_name?: string;

  @ApiPropertyOptional({
    example: "Rahimova Dilnoza Shuhratovna",
    description: "Accountant full name",
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  accountant_name?: string;

  // Fiscal data
  @ApiPropertyOptional({
    type: FiscalSettingsDto,
    description: "OFD fiscal integration settings",
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => FiscalSettingsDto)
  fiscal_settings?: FiscalSettingsDto;

  // Subscription
  @ApiPropertyOptional({
    enum: SubscriptionTier,
    default: SubscriptionTier.FREE,
    description: "Subscription tier",
  })
  @IsOptional()
  @IsEnum(SubscriptionTier)
  subscription_tier?: SubscriptionTier;

  @ApiPropertyOptional({
    example: "2025-01-01T00:00:00Z",
    description: "Subscription start date",
  })
  @IsOptional()
  @IsDateString()
  subscription_start_date?: string;

  @ApiPropertyOptional({
    example: "2026-01-01T00:00:00Z",
    description: "Subscription expiry date",
  })
  @IsOptional()
  @IsDateString()
  subscription_expires_at?: string;

  // Limits
  @ApiPropertyOptional({
    type: OrganizationLimitsDto,
    description: "Organization resource limits",
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrganizationLimitsDto)
  limits?: OrganizationLimitsDto;

  // Settings
  @ApiPropertyOptional({
    type: OrganizationSettingsDto,
    description: "Organization settings",
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrganizationSettingsDto)
  settings?: OrganizationSettingsDto;

  // Commission settings (for franchises)
  @ApiPropertyOptional({
    type: CommissionSettingsDto,
    description: "Commission settings for franchise organizations",
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CommissionSettingsDto)
  commission_settings?: CommissionSettingsDto;

  // Metadata
  @ApiPropertyOptional({ example: {}, description: "Additional metadata" })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
