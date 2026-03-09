/**
 * Create Location DTO
 * Validates input for creating a new location
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsNumber,
  IsBoolean,
  IsObject,
  IsArray,
  IsDateString,
  IsLatitude,
  IsLongitude,
  MaxLength,
  Min,
  Max,
  ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { LocationType, LocationStatus } from "../entities/location.entity";
import { ContractType } from "../../../common/enums";

// ============================================================================
// NESTED DTOs for JSONB fields
// ============================================================================

export class AddressDto {
  @ApiProperty({ example: "Uzbekistan" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  country: string;

  @ApiProperty({ example: "Toshkent viloyati" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  region: string;

  @ApiProperty({ example: "Toshkent" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @ApiPropertyOptional({ example: "Mirzo Ulug'bek tumani" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @ApiProperty({ example: "Amir Temur ko'chasi" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  street: string;

  @ApiProperty({ example: "15A" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  building: string;

  @ApiPropertyOptional({ example: "2" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  floor?: string;

  @ApiPropertyOptional({ example: "201" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  room?: string;

  @ApiPropertyOptional({ example: "A" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  entrance?: string;

  @ApiPropertyOptional({ example: "100000" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({ example: "Near the bank" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  landmark?: string;

  @ApiPropertyOptional({ example: "Toshkent, Amir Temur ko'chasi, 15A" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  fullAddress?: string;
}

export class LocationCoordinatesDto {
  @ApiProperty({ example: 41.311081 })
  @IsLatitude()
  latitude: number;

  @ApiProperty({ example: 69.279737 })
  @IsLongitude()
  longitude: number;

  @ApiPropertyOptional({ example: 5.0, description: "Accuracy in meters" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracy?: number;

  @ApiPropertyOptional({ example: 450.0 })
  @IsOptional()
  @IsNumber()
  altitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  capturedAt?: Date;
}

export class ContactPersonDto {
  @ApiProperty({ example: "Aziz Karimov" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: "Director" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  position?: string;

  @ApiPropertyOptional({ example: "+998901234567" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ example: "+998901234568" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  altPhone?: string;

  @ApiPropertyOptional({ example: "aziz@example.com" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: "@azizkarimov" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  telegram?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isDecisionMaker: boolean;

  @ApiPropertyOptional({ example: "Available after 14:00" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class HolidayDto {
  @ApiProperty({ example: "2024-01-01" })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ example: "New Year" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  isOpen: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  schedule?: Record<string, unknown>;
}

// ============================================================================
// MAIN CREATE DTO
// ============================================================================

export class CreateLocationDto {
  // ===== Basic information =====

  @ApiProperty({
    example: "Mega Planet Shopping Center",
    description: "Location name",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    example: "LOC-TAS-001",
    description: "Location code (auto-generated if not provided)",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  code?: string;

  @ApiPropertyOptional({
    example: "Large shopping center with high foot traffic",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: LocationType,
    default: LocationType.OTHER,
    description: "Type of location",
  })
  @IsOptional()
  @IsEnum(LocationType)
  type?: LocationType;

  @ApiPropertyOptional({
    enum: LocationStatus,
    default: LocationStatus.PROSPECTING,
    description: "Location status",
  })
  @IsOptional()
  @IsEnum(LocationStatus)
  status?: LocationStatus;

  // ===== Address =====

  @ApiProperty({ type: AddressDto, description: "Full address as JSON object" })
  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;

  @ApiProperty({ example: "Toshkent", description: "City name (for indexing)" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @ApiPropertyOptional({ example: "Toshkent viloyati" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;

  @ApiPropertyOptional({ example: "100000" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postal_code?: string;

  // ===== Coordinates =====

  @ApiProperty({ example: 41.311081, description: "Latitude" })
  @IsLatitude()
  latitude: number;

  @ApiProperty({ example: 69.279737, description: "Longitude" })
  @IsLongitude()
  longitude: number;

  @ApiPropertyOptional({
    type: LocationCoordinatesDto,
    description: "Detailed GPS coordinates",
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationCoordinatesDto)
  coordinates?: LocationCoordinatesDto;

  // ===== Contacts =====

  @ApiPropertyOptional({
    type: [ContactPersonDto],
    description: "Contact persons",
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactPersonDto)
  contacts?: ContactPersonDto[];

  @ApiPropertyOptional({ example: "Aziz Karimov" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  primary_contact_name?: string;

  @ApiPropertyOptional({ example: "+998901234567" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  primary_contact_phone?: string;

  @ApiPropertyOptional({ example: "aziz@example.com" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  primary_contact_email?: string;

  // ===== Schedule =====

  @ApiPropertyOptional({ description: "Weekly working hours schedule" })
  @IsOptional()
  @IsObject()
  working_hours?: Record<string, unknown>;

  @ApiPropertyOptional({
    example: false,
    description: "Whether location operates 24/7",
  })
  @IsOptional()
  @IsBoolean()
  is_24_hours?: boolean;

  @ApiPropertyOptional({
    type: [HolidayDto],
    description: "Holiday schedule overrides",
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HolidayDto)
  holidays?: HolidayDto[];

  @ApiPropertyOptional({ example: "Asia/Tashkent", default: "Asia/Tashkent" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  // ===== Characteristics =====

  @ApiPropertyOptional({
    description: "Location characteristics (infrastructure, traffic, etc.)",
  })
  @IsOptional()
  @IsObject()
  characteristics?: Record<string, unknown>;

  // ===== Financial =====

  @ApiPropertyOptional({
    enum: ContractType,
    default: ContractType.RENT,
    description: "Contract type",
  })
  @IsOptional()
  @IsEnum(ContractType)
  contract_type?: ContractType;

  @ApiPropertyOptional({ example: 500000, description: "Monthly rent amount" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthly_rent?: number;

  @ApiPropertyOptional({
    example: 10.5,
    description: "Revenue share percentage",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  revenue_share_percent?: number;

  @ApiPropertyOptional({
    example: "UZS",
    default: "UZS",
    description: "Currency code",
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  // ===== Active Contract =====

  @ApiPropertyOptional({ description: "UUID of the active contract" })
  @IsOptional()
  @IsUUID()
  active_contract_id?: string;

  // ===== Statistics (usually set by system, but allowed for import) =====

  @ApiPropertyOptional({ description: "Location statistics (JSON)" })
  @IsOptional()
  @IsObject()
  stats?: Record<string, unknown>;

  @ApiPropertyOptional({
    example: 0,
    description: "Number of machines at location",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  machine_count?: number;

  // ===== Ratings =====

  @ApiPropertyOptional({ example: 4.5, description: "Overall rating 1-5" })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rating_count?: number;

  // ===== Priority & Assessment =====

  @ApiPropertyOptional({ example: 7, description: "Priority score 1-10" })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  priority_score?: number;

  @ApiPropertyOptional({ example: 8, description: "Potential score 1-10" })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  potential_score?: number;

  @ApiPropertyOptional({ example: 3, description: "Risk score 1-10" })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  risk_score?: number;

  // ===== Metadata =====

  @ApiPropertyOptional({ description: "Additional metadata (JSON)" })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    example: ["premium", "high-traffic"],
    description: "Tags for filtering",
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  // ===== Flags =====

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description: "VIP location",
  })
  @IsOptional()
  @IsBoolean()
  is_vip?: boolean;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description: "Requires approval for actions",
  })
  @IsOptional()
  @IsBoolean()
  requires_approval?: boolean;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description: "Has exclusivity agreement",
  })
  @IsOptional()
  @IsBoolean()
  has_exclusivity?: boolean;

  // ===== Responsible persons =====

  @ApiPropertyOptional({ description: "UUID of the assigned manager" })
  @IsOptional()
  @IsUUID()
  manager_id?: string;

  @ApiPropertyOptional({
    description: "UUID of the assigned sales representative",
  })
  @IsOptional()
  @IsUUID()
  sales_rep_id?: string;

  // ===== Timestamps =====

  @ApiPropertyOptional({ description: "Date when location was activated" })
  @IsOptional()
  @IsDateString()
  activated_at?: string;

  @ApiPropertyOptional({ description: "Date of last visit" })
  @IsOptional()
  @IsDateString()
  last_visit_at?: string;

  @ApiPropertyOptional({ description: "Date of next planned visit" })
  @IsOptional()
  @IsDateString()
  next_visit_at?: string;
}
