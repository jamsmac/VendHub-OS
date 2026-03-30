/**
 * Notification Rule DTOs
 * CRUD operations for notification automation rules
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsUUID,
  IsInt,
  IsObject,
  MaxLength,
  Min,
  Max,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  NotificationChannel,
  NotificationType,
  NotificationPriority,
} from "@vendhub/shared";
import { EventCategory } from "../entities/notification.enums";

export class CreateNotificationRuleDto {
  @ApiPropertyOptional({ description: "Organization ID (auto-resolved)" })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiProperty({ description: "Rule name", maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: "Rule description" })
  @IsOptional()
  @IsString()
  description?: string;

  // ===== Trigger =====

  @ApiProperty({ description: "Event category", enum: EventCategory })
  @IsEnum(EventCategory)
  eventCategory: EventCategory;

  @ApiProperty({
    description: 'Event type (e.g. "machine.offline", "task.created")',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  eventType: string;

  @ApiPropertyOptional({
    description: "Trigger conditions (JSONB array)",
    type: "array",
  })
  @IsOptional()
  @IsArray()
  conditions?: Array<{
    field: string;
    operator:
      | "equals"
      | "not_equals"
      | "contains"
      | "greater_than"
      | "less_than"
      | "in"
      | "not_in";
    value: unknown;
  }>;

  @ApiPropertyOptional({
    description: "All conditions must match (AND) vs any (OR)",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  allConditionsMustMatch?: boolean;

  // ===== Actions =====

  @ApiPropertyOptional({ description: "Notification template ID" })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiProperty({ description: "Notification type", enum: NotificationType })
  @IsEnum(NotificationType)
  notificationType: NotificationType;

  @ApiProperty({
    description: "Delivery channels",
    enum: NotificationChannel,
    isArray: true,
  })
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels: NotificationChannel[];

  @ApiPropertyOptional({
    description: "Notification priority",
    enum: NotificationPriority,
    default: NotificationPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  // ===== Recipients =====

  @ApiPropertyOptional({
    description: "Recipient type",
    enum: ["specific_users", "role", "assignee", "manager", "all"],
    default: "assignee",
  })
  @IsOptional()
  @IsEnum(["specific_users", "role", "assignee", "manager", "all"])
  recipientType?: "specific_users" | "role" | "assignee" | "manager" | "all";

  @ApiPropertyOptional({
    description: "Specific user IDs (for recipientType=specific_users)",
  })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  specificUserIds?: string[];

  @ApiPropertyOptional({
    description: 'Roles to notify (for recipientType=role)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  // ===== Advanced =====

  @ApiPropertyOptional({ description: "Delay before sending (minutes)" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  delayMinutes?: number;

  @ApiPropertyOptional({ description: "Group similar notifications" })
  @IsOptional()
  @IsBoolean()
  groupSimilar?: boolean;

  @ApiPropertyOptional({ description: "Group window (minutes)" })
  @IsOptional()
  @IsInt()
  @Min(0)
  groupWindowMinutes?: number;

  @ApiPropertyOptional({
    description: "Cooldown — min minutes between sends",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  cooldownMinutes?: number;

  @ApiPropertyOptional({ description: "Schedule (active days/hours)" })
  @IsOptional()
  @IsObject()
  schedule?: {
    activeDays?: number[];
    activeHoursStart?: string;
    activeHoursEnd?: string;
    timezone?: string;
  };

  @ApiPropertyOptional({ description: "Is rule active", default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateNotificationRuleDto {
  @ApiPropertyOptional({ description: "Rule name", maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: "Rule description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "Event category", enum: EventCategory })
  @IsOptional()
  @IsEnum(EventCategory)
  eventCategory?: EventCategory;

  @ApiPropertyOptional({
    description: "Event type",
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  eventType?: string;

  @ApiPropertyOptional({ description: "Trigger conditions" })
  @IsOptional()
  @IsArray()
  conditions?: Array<{
    field: string;
    operator:
      | "equals"
      | "not_equals"
      | "contains"
      | "greater_than"
      | "less_than"
      | "in"
      | "not_in";
    value: unknown;
  }>;

  @ApiPropertyOptional({ description: "All conditions must match (AND)" })
  @IsOptional()
  @IsBoolean()
  allConditionsMustMatch?: boolean;

  @ApiPropertyOptional({ description: "Template ID" })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({
    description: "Notification type",
    enum: NotificationType,
  })
  @IsOptional()
  @IsEnum(NotificationType)
  notificationType?: NotificationType;

  @ApiPropertyOptional({
    description: "Delivery channels",
    enum: NotificationChannel,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];

  @ApiPropertyOptional({
    description: "Notification priority",
    enum: NotificationPriority,
  })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiPropertyOptional({
    description: "Recipient type",
    enum: ["specific_users", "role", "assignee", "manager", "all"],
  })
  @IsOptional()
  @IsEnum(["specific_users", "role", "assignee", "manager", "all"])
  recipientType?: "specific_users" | "role" | "assignee" | "manager" | "all";

  @ApiPropertyOptional({ description: "Specific user IDs" })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  specificUserIds?: string[];

  @ApiPropertyOptional({ description: "Roles to notify" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  @ApiPropertyOptional({ description: "Delay before sending (minutes)" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  delayMinutes?: number;

  @ApiPropertyOptional({ description: "Group similar notifications" })
  @IsOptional()
  @IsBoolean()
  groupSimilar?: boolean;

  @ApiPropertyOptional({ description: "Group window (minutes)" })
  @IsOptional()
  @IsInt()
  @Min(0)
  groupWindowMinutes?: number;

  @ApiPropertyOptional({ description: "Cooldown (minutes)" })
  @IsOptional()
  @IsInt()
  @Min(0)
  cooldownMinutes?: number;

  @ApiPropertyOptional({ description: "Schedule" })
  @IsOptional()
  @IsObject()
  schedule?: {
    activeDays?: number[];
    activeHoursStart?: string;
    activeHoursEnd?: string;
    timezone?: string;
  };

  @ApiPropertyOptional({ description: "Is rule active" })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
