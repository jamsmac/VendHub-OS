/**
 * DTO for updating user notification settings
 */

import {
  IsOptional,
  IsBoolean,
  IsString,
  IsEnum,
  IsArray,
  IsObject,
  Length,
  Matches,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  NotificationChannel,
  NotificationPriority,
  NotificationType,
} from "../entities/notification.entity";

export class UpdateNotificationSettingsDto {
  // ===== Global settings =====

  @ApiPropertyOptional({ description: "Enable/disable all notifications" })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: "Quiet hours start time (HH:mm)",
    example: "22:00",
  })
  @IsOptional()
  @IsString()
  @Length(5, 5)
  @Matches(/^\d{2}:\d{2}$/, {
    message: "quietHoursStart must be in HH:mm format",
  })
  quietHoursStart?: string;

  @ApiPropertyOptional({
    description: "Quiet hours end time (HH:mm)",
    example: "08:00",
  })
  @IsOptional()
  @IsString()
  @Length(5, 5)
  @Matches(/^\d{2}:\d{2}$/, {
    message: "quietHoursEnd must be in HH:mm format",
  })
  quietHoursEnd?: string;

  @ApiPropertyOptional({
    description: "User timezone",
    example: "Asia/Tashkent",
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  timezone?: string;

  @ApiPropertyOptional({ description: "Preferred language", example: "ru" })
  @IsOptional()
  @IsString()
  @Length(2, 5)
  language?: string;

  // ===== Channel toggles =====

  @ApiPropertyOptional({ description: "Enable push notifications" })
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @ApiPropertyOptional({ description: "Enable email notifications" })
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @ApiPropertyOptional({ description: "Enable SMS notifications" })
  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;

  @ApiPropertyOptional({ description: "Enable Telegram notifications" })
  @IsOptional()
  @IsBoolean()
  telegramEnabled?: boolean;

  @ApiPropertyOptional({ description: "Enable in-app notifications" })
  @IsOptional()
  @IsBoolean()
  inAppEnabled?: boolean;

  // ===== Delivery addresses =====

  @ApiPropertyOptional({ description: "Notification email address" })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  email?: string;

  @ApiPropertyOptional({ description: "Notification phone number" })
  @IsOptional()
  @IsString()
  @Length(0, 20)
  phone?: string;

  @ApiPropertyOptional({ description: "Telegram user ID" })
  @IsOptional()
  @IsString()
  @Length(0, 50)
  telegramId?: string;

  // ===== Type-specific settings =====

  @ApiPropertyOptional({
    description:
      "Per-type notification settings (key: NotificationType, value: { enabled, channels?, minPriority? })",
  })
  @IsOptional()
  @IsObject()
  typeSettings?: {
    [key in NotificationType]?: {
      enabled: boolean;
      channels?: NotificationChannel[];
      minPriority?: NotificationPriority;
    };
  };

  // ===== Digest settings =====

  @ApiPropertyOptional({ description: "Enable digest emails" })
  @IsOptional()
  @IsBoolean()
  digestEnabled?: boolean;

  @ApiPropertyOptional({
    description: "Digest frequency",
    enum: ["daily", "weekly", "none"],
  })
  @IsOptional()
  @IsEnum(["daily", "weekly", "none"])
  digestFrequency?: "daily" | "weekly" | "none";

  @ApiPropertyOptional({
    description: "Digest delivery time (HH:mm)",
    example: "09:00",
  })
  @IsOptional()
  @IsString()
  @Length(5, 5)
  @Matches(/^\d{2}:\d{2}$/, { message: "digestTime must be in HH:mm format" })
  digestTime?: string;

  @ApiPropertyOptional({
    description: "Channels for digest delivery",
    enum: NotificationChannel,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  digestChannels?: NotificationChannel[];
}
