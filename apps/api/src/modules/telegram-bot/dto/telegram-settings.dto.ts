/**
 * Telegram Settings & Analytics DTOs
 * Validation and Swagger docs for settings, analytics, and message log endpoints
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  IsUUID,
  IsDateString,
  IsUrl,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TelegramLanguage } from '../entities/telegram-user.entity';
import { TelegramMessageType } from '../entities/telegram-message-log.entity';
import { TelegramEventType } from '../entities/telegram-bot-analytics.entity';

// ============================================================================
// UPDATE SETTINGS DTO
// ============================================================================

export class UpdateTelegramSettingsDto {
  @ApiPropertyOptional({
    description: 'Bot mode: polling or webhook',
    example: 'polling',
  })
  @IsOptional()
  @IsString()
  mode?: string;

  @ApiPropertyOptional({
    description: 'Webhook URL (required if mode is webhook)',
    example: 'https://api.vendhub.uz/api/v1/telegram-bot/webhook',
  })
  @IsOptional()
  @IsUrl()
  webhookUrl?: string;

  @ApiPropertyOptional({
    description: 'Whether the bot is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to send notifications',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  sendNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum messages per minute (rate limit)',
    example: 30,
    minimum: 1,
    maximum: 60,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  maxMessagesPerMinute?: number;

  @ApiPropertyOptional({
    description: 'Default language for new users',
    enum: TelegramLanguage,
  })
  @IsOptional()
  @IsEnum(TelegramLanguage)
  defaultLanguage?: TelegramLanguage;

  @ApiPropertyOptional({
    description: 'Welcome message in Russian',
    example: 'Welcome to VendHub!',
  })
  @IsOptional()
  @IsString()
  welcomeMessageRu?: string;

  @ApiPropertyOptional({
    description: 'Welcome message in Uzbek',
    example: 'VendHub-ga xush kelibsiz!',
  })
  @IsOptional()
  @IsString()
  welcomeMessageUz?: string;

  @ApiPropertyOptional({
    description: 'Welcome message in English',
    example: 'Welcome to VendHub!',
  })
  @IsOptional()
  @IsString()
  welcomeMessageEn?: string;
}

// ============================================================================
// QUERY ANALYTICS DTO
// ============================================================================

export class QueryAnalyticsDto {
  @ApiPropertyOptional({
    description: 'Start date (ISO string)',
    example: '2025-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'End date (ISO string)',
    example: '2025-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Filter by event type',
    enum: TelegramEventType,
  })
  @IsOptional()
  @IsEnum(TelegramEventType)
  eventType?: TelegramEventType;

  @ApiPropertyOptional({
    description: 'Filter by bot type (staff or customer)',
    example: 'staff',
  })
  @IsOptional()
  @IsString()
  botType?: string;

  @ApiPropertyOptional({ description: 'Page number', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

// ============================================================================
// QUERY MESSAGES DTO
// ============================================================================

export class QueryMessagesDto {
  @ApiPropertyOptional({
    description: 'Filter by telegram user ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  telegramUserId?: string;

  @ApiPropertyOptional({
    description: 'Filter by message type',
    enum: TelegramMessageType,
  })
  @IsOptional()
  @IsEnum(TelegramMessageType)
  messageType?: TelegramMessageType;

  @ApiPropertyOptional({
    description: 'Filter by direction (incoming or outgoing)',
    example: 'incoming',
  })
  @IsOptional()
  @IsString()
  direction?: string;

  @ApiPropertyOptional({
    description: 'Start date (ISO string)',
    example: '2025-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'End date (ISO string)',
    example: '2025-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Page number', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
