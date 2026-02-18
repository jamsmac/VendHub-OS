/**
 * Create Fiscal Device DTO
 * For registering a new fiscal device (OFD/MultiKassa) in the system.
 */

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsNumber,
  MaxLength,
  ValidateNested,
  Matches,
} from "class-validator";
import { Type } from "class-transformer";

// ============================================================================
// NESTED DTOs
// ============================================================================

export class FiscalDeviceCredentialsDto {
  @ApiPropertyOptional({ description: "Login for the fiscal provider API" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  login?: string;

  @ApiPropertyOptional({ description: "Password for the fiscal provider API" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  password?: string;

  @ApiPropertyOptional({
    description: "Company TIN (INN) for fiscal registration",
    example: "123456789",
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  company_tin?: string;

  @ApiPropertyOptional({ description: "API key for the fiscal provider" })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  api_key?: string;
}

export class FiscalDeviceConfigDto {
  @ApiPropertyOptional({
    description: "Base URL for the fiscal provider API",
    example: "http://localhost:8080/api/v1",
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  base_url?: string;

  @ApiPropertyOptional({
    description: "Default cashier name for auto-opened shifts",
    example: "VendHub Auto",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  default_cashier?: string;

  @ApiPropertyOptional({
    description: "Applicable VAT rates (e.g., [12, 0])",
    example: [12, 0],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  vat_rates?: number[];

  @ApiPropertyOptional({
    description:
      "Automatically open a shift when a receipt is created and no shift is open",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  auto_open_shift?: boolean;

  @ApiPropertyOptional({
    description: "Automatically close shift at the specified time",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  auto_close_shift?: boolean;

  @ApiPropertyOptional({
    description: "Time to auto-close shift (HH:mm format)",
    example: "23:59",
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, {
    message: "close_shift_at must be in HH:mm format",
  })
  close_shift_at?: string;
}

// ============================================================================
// MAIN DTO
// ============================================================================

export class CreateFiscalDeviceDto {
  @ApiProperty({
    description: "Device display name",
    example: "MultiKassa Device #1",
  })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: "Fiscal provider type",
    example: "multikassa",
    enum: ["multikassa", "ofd"],
  })
  @IsString()
  @MaxLength(50)
  provider: string;

  @ApiPropertyOptional({
    description: "Device serial number",
    example: "MK-2024-001",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serial_number?: string;

  @ApiPropertyOptional({
    description: "Terminal ID from the fiscal provider",
    example: "TERM-001",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  terminal_id?: string;

  @ApiProperty({
    description: "Credentials for authenticating with the fiscal provider",
    type: FiscalDeviceCredentialsDto,
  })
  @ValidateNested()
  @Type(() => FiscalDeviceCredentialsDto)
  credentials: FiscalDeviceCredentialsDto;

  @ApiPropertyOptional({
    description: "Enable sandbox/test mode",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  sandbox_mode?: boolean;

  @ApiPropertyOptional({
    description: "Device configuration options",
    type: FiscalDeviceConfigDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => FiscalDeviceConfigDto)
  config?: FiscalDeviceConfigDto;
}
