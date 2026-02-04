import { ApiProperty, ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsInt,
  IsEnum,
  IsArray,
  IsObject,
  IsUrl,
  Length,
  Min,
  Max,
} from 'class-validator';
import { PaymentProviderType } from '../entities/payment-provider.entity';

/**
 * DTO for creating a payment provider entry.
 */
export class CreatePaymentProviderDto {
  @ApiProperty({
    description: 'Provider code (unique identifier)',
    example: 'payme',
    maxLength: 50,
  })
  @IsString()
  @Length(1, 50)
  code: string;

  @ApiProperty({
    description: 'Provider display name',
    example: 'Payme',
    maxLength: 255,
  })
  @IsString()
  @Length(1, 255)
  name: string;

  @ApiPropertyOptional({
    description: 'Name in Russian',
    example: 'Payme',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name_ru?: string;

  @ApiPropertyOptional({
    description: 'Name in Uzbek',
    example: 'Payme',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name_uz?: string;

  @ApiProperty({
    description: 'Payment provider type',
    enum: PaymentProviderType,
    example: PaymentProviderType.CARD,
  })
  @IsEnum(PaymentProviderType)
  type: PaymentProviderType;

  @ApiPropertyOptional({
    description: 'URL to provider logo image',
    example: 'https://cdn.vendhub.uz/providers/payme.svg',
  })
  @IsOptional()
  @IsString()
  logo_url?: string;

  @ApiPropertyOptional({
    description: 'Provider website URL',
    example: 'https://payme.uz',
  })
  @IsOptional()
  @IsUrl()
  website_url?: string;

  @ApiPropertyOptional({
    description: 'Whether this provider is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Whether this is the default payment provider',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @ApiPropertyOptional({
    description: 'Commission rate percentage',
    example: 1.5,
    minimum: 0,
    maximum: 100,
    default: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  commission_rate?: number;

  @ApiPropertyOptional({
    description: 'Provider-specific settings schema (API keys, endpoints, etc.)',
    example: { merchant_id: '', api_key: '', endpoint: 'https://checkout.payme.uz' },
  })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'List of supported currency codes',
    example: ['UZS'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supported_currencies?: string[];

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
 * DTO for updating a payment provider entry.
 * All fields optional except code (immutable).
 */
export class UpdatePaymentProviderDto extends PartialType(
  OmitType(CreatePaymentProviderDto, ['code'] as const),
) {}
