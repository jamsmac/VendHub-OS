import { ApiProperty, ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsInt,
  IsDateString,
  Length,
  Min,
  Max,
} from 'class-validator';

/**
 * DTO for creating a VAT rate entry.
 */
export class CreateVatRateDto {
  @ApiProperty({
    description: 'VAT rate code (unique identifier)',
    example: 'STANDARD',
    maxLength: 50,
  })
  @IsString()
  @Length(1, 50)
  code: string;

  @ApiProperty({
    description: 'VAT rate percentage',
    example: 12.00,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  rate: number;

  @ApiProperty({
    description: 'Name in Russian',
    example: 'Стандартная ставка НДС',
    maxLength: 255,
  })
  @IsString()
  @Length(1, 255)
  name_ru: string;

  @ApiPropertyOptional({
    description: 'Name in Uzbek',
    example: 'Standart QQS stavkasi',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name_uz?: string;

  @ApiPropertyOptional({
    description: 'Detailed description of this VAT rate',
    example: 'Standard VAT rate for most goods and services in Uzbekistan',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether this is the default VAT rate',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @ApiPropertyOptional({
    description: 'Whether this VAT rate is currently active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Date from which this rate is effective (ISO 8601)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  effective_from?: string;

  @ApiPropertyOptional({
    description: 'Date until which this rate is effective (ISO 8601)',
    example: '2025-12-31',
  })
  @IsOptional()
  @IsDateString()
  effective_to?: string;

  @ApiPropertyOptional({
    description: 'Sort order for display',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;
}

/**
 * DTO for updating a VAT rate entry.
 * All fields optional except code (immutable).
 */
export class UpdateVatRateDto extends PartialType(
  OmitType(CreateVatRateDto, ['code'] as const),
) {}
