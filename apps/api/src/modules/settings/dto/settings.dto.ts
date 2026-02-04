/**
 * Settings DTOs
 *
 * Validation and Swagger documentation for Settings endpoints.
 * Covers SystemSetting and AiProviderKey create/update operations.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsUUID,
  IsUrl,
  IsObject,
  Length,
  MaxLength,
} from 'class-validator';
import { SettingCategory } from '../entities/system-setting.entity';
import { AiProvider } from '../entities/ai-provider-key.entity';

// ============================================================================
// SYSTEM SETTINGS DTOs
// ============================================================================

export class CreateSettingDto {
  @ApiProperty({ description: 'Unique setting key', example: 'smtp.host' })
  @IsString()
  @Length(1, 255)
  key: string;

  @ApiProperty({
    description: 'Setting value (any JSON-serializable data)',
    example: 'smtp.example.com',
    required: false,
  })
  @IsOptional()
  value?: any;

  @ApiPropertyOptional({
    description: 'Setting category',
    enum: SettingCategory,
    example: SettingCategory.SMTP,
  })
  @IsOptional()
  @IsEnum(SettingCategory)
  category?: SettingCategory;

  @ApiPropertyOptional({
    description: 'Human-readable description of the setting',
    example: 'SMTP server hostname for outgoing emails',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the value should be encrypted at rest',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isEncrypted?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the setting is publicly accessible without auth',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Organization UUID (null for global settings)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}

export class UpdateSettingDto {
  @ApiProperty({
    description: 'New setting value (any JSON-serializable data)',
    example: 'new-smtp.example.com',
    required: false,
  })
  @IsOptional()
  value?: any;

  @ApiPropertyOptional({
    description: 'Human-readable description of the setting',
    example: 'Updated SMTP server hostname',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the value should be encrypted at rest',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isEncrypted?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the setting is publicly accessible without auth',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

// ============================================================================
// AI PROVIDER KEY DTOs
// ============================================================================

export class CreateAiProviderKeyDto {
  @ApiProperty({
    description: 'AI provider type',
    enum: AiProvider,
    example: AiProvider.OPENAI,
  })
  @IsEnum(AiProvider)
  provider: AiProvider;

  @ApiProperty({
    description: 'Display name for this provider configuration',
    example: 'OpenAI Production Key',
  })
  @IsString()
  @Length(1, 255)
  name: string;

  @ApiProperty({
    description: 'API key for the provider (will be encrypted at rest)',
    example: 'sk-...',
  })
  @IsString()
  @Length(1, 1000)
  apiKey: string;

  @ApiPropertyOptional({
    description: 'Default model to use',
    example: 'gpt-4o',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @ApiPropertyOptional({
    description: 'Custom API base URL (for proxies or self-hosted)',
    example: 'https://api.openai.com/v1',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  baseUrl?: string;

  @ApiPropertyOptional({
    description: 'Organization UUID (null for global key)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({
    description: 'Additional provider-specific configuration',
    example: { maxTokens: 4096, temperature: 0.7 },
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}

export class UpdateAiProviderKeyDto {
  @ApiPropertyOptional({
    description: 'Display name for this provider configuration',
    example: 'OpenAI Production Key v2',
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @ApiPropertyOptional({
    description: 'New API key (will be encrypted at rest)',
    example: 'sk-new-...',
  })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  apiKey?: string;

  @ApiPropertyOptional({
    description: 'Default model to use',
    example: 'gpt-4o-mini',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @ApiPropertyOptional({
    description: 'Custom API base URL',
    example: 'https://api.openai.com/v1',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  baseUrl?: string;

  @ApiPropertyOptional({
    description: 'Whether this provider key is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Additional provider-specific configuration',
    example: { maxTokens: 8192 },
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}
