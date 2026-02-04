/**
 * Telegram User DTOs
 * Validation and Swagger docs for Telegram user endpoints
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsInt,
  Min,
  Max,
  IsBooleanString,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TelegramUserStatus, TelegramLanguage } from '../entities/telegram-user.entity';

// ============================================================================
// QUERY DTOs
// ============================================================================

export class QueryTelegramUsersDto {
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

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: TelegramUserStatus,
  })
  @IsOptional()
  @IsEnum(TelegramUserStatus)
  status?: TelegramUserStatus;

  @ApiPropertyOptional({
    description: 'Filter by bot type (staff or customer)',
    example: 'staff',
  })
  @IsOptional()
  @IsString()
  botType?: string;

  @ApiPropertyOptional({
    description: 'Search by username, first_name, last_name, or phone',
    example: 'john',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by verified status',
    example: 'true',
  })
  @IsOptional()
  @IsBooleanString()
  isVerified?: string;
}

// ============================================================================
// UPDATE DTO
// ============================================================================

export class UpdateTelegramUserDto {
  @ApiPropertyOptional({
    description: 'Preferred language',
    enum: TelegramLanguage,
  })
  @IsOptional()
  @IsEnum(TelegramLanguage)
  language?: TelegramLanguage;

  @ApiPropertyOptional({
    description: 'Notification preferences',
    example: { tasks: true, machines: true, alerts: true },
  })
  @IsOptional()
  @IsObject()
  notificationPreferences?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'User status',
    enum: TelegramUserStatus,
  })
  @IsOptional()
  @IsEnum(TelegramUserStatus)
  status?: TelegramUserStatus;
}

// ============================================================================
// VERIFY DTO
// ============================================================================

export class VerifyTelegramUserDto {
  @ApiProperty({
    description: 'Telegram user ID',
    example: '123456789',
  })
  @IsString()
  telegramId: string;

  @ApiProperty({
    description: 'Verification code (4-10 characters)',
    example: '1234',
  })
  @IsString()
  @Length(4, 10)
  verificationCode: string;
}
