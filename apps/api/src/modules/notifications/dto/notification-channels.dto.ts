/**
 * Notification Channel DTOs for VendHub OS
 * DTOs for push subscription and FCM token management
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { DeviceType } from '../entities/fcm-token.entity';

// ============================================================================
// Web Push Subscription
// ============================================================================

export class SubscribePushDto {
  @ApiProperty({ description: 'Web Push endpoint URL' })
  @IsString()
  endpoint: string;

  @ApiProperty({ description: 'Web Push p256dh key' })
  @IsString()
  p256dh: string;

  @ApiProperty({ description: 'Web Push auth secret' })
  @IsString()
  auth: string;

  @ApiPropertyOptional({ description: 'User agent string of the subscribing browser' })
  @IsOptional()
  @IsString()
  userAgent?: string;
}

export class UnsubscribePushDto {
  @ApiProperty({ description: 'Web Push endpoint URL to unsubscribe' })
  @IsString()
  endpoint: string;
}

// ============================================================================
// FCM Token
// ============================================================================

export class RegisterFcmDto {
  @ApiProperty({ description: 'FCM device token' })
  @IsString()
  token: string;

  @ApiProperty({ description: 'Device type', enum: DeviceType })
  @IsEnum(DeviceType)
  deviceType: DeviceType;

  @ApiPropertyOptional({ description: 'Human-readable device name', example: 'iPhone 15 Pro' })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({ description: 'Unique device identifier' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class UnregisterFcmDto {
  @ApiProperty({ description: 'FCM token to unregister' })
  @IsString()
  token: string;
}
