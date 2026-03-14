/**
 * DTOs for notification template management
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  Length,
  ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
} from "../entities/notification.entity";

class TemplateVariableDto {
  @ApiProperty({ description: "Variable name" })
  @IsString()
  name: string;

  @ApiProperty({ description: "Variable description" })
  @IsString()
  description: string;

  @ApiProperty({ description: "Whether variable is required" })
  @IsBoolean()
  required: boolean;
}

export class CreateNotificationTemplateDto {
  @ApiProperty({ description: "Template name", maxLength: 100 })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiProperty({
    description: "Template code (e.g. TASK_ASSIGNED)",
    maxLength: 50,
  })
  @IsString()
  @Length(1, 50)
  code: string;

  @ApiPropertyOptional({ description: "Template description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: "Notification type", enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  // ===== Content (Russian - required) =====

  @ApiProperty({ description: "Title in Russian", maxLength: 255 })
  @IsString()
  @Length(1, 255)
  titleRu: string;

  @ApiProperty({ description: "Body in Russian" })
  @IsString()
  bodyRu: string;

  @ApiPropertyOptional({ description: "Short body in Russian" })
  @IsOptional()
  @IsString()
  shortBodyRu?: string;

  @ApiPropertyOptional({ description: "HTML body in Russian" })
  @IsOptional()
  @IsString()
  htmlBodyRu?: string;

  // ===== Content (Uzbek - optional) =====

  @ApiPropertyOptional({ description: "Title in Uzbek", maxLength: 255 })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  titleUz?: string;

  @ApiPropertyOptional({ description: "Body in Uzbek" })
  @IsOptional()
  @IsString()
  bodyUz?: string;

  @ApiPropertyOptional({ description: "Short body in Uzbek" })
  @IsOptional()
  @IsString()
  shortBodyUz?: string;

  // ===== Content (English - optional) =====

  @ApiPropertyOptional({ description: "Title in English", maxLength: 255 })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  titleEn?: string;

  @ApiPropertyOptional({ description: "Body in English" })
  @IsOptional()
  @IsString()
  bodyEn?: string;

  // ===== Settings =====

  @ApiPropertyOptional({
    description: "Default delivery channels",
    enum: NotificationChannel,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  defaultChannels?: NotificationChannel[];

  @ApiPropertyOptional({
    description: "Default priority",
    enum: NotificationPriority,
  })
  @IsOptional()
  @IsEnum(NotificationPriority)
  defaultPriority?: NotificationPriority;

  @ApiPropertyOptional({
    description: "Available template variables",
    type: [TemplateVariableDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateVariableDto)
  availableVariables?: TemplateVariableDto[];

  // ===== Action =====

  @ApiPropertyOptional({ description: "Action URL" })
  @IsOptional()
  @IsString()
  actionUrl?: string;

  @ApiPropertyOptional({
    description: "Action button text in Russian",
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  actionTextRu?: string;

  @ApiPropertyOptional({
    description: "Action button text in Uzbek",
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  actionTextUz?: string;
}

export class UpdateNotificationTemplateDto {
  @ApiPropertyOptional({ description: "Template name", maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional({
    description: "Template code (e.g. TASK_ASSIGNED)",
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  code?: string;

  @ApiPropertyOptional({ description: "Template description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: "Notification type",
    enum: NotificationType,
  })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  // ===== Content (Russian) =====

  @ApiPropertyOptional({ description: "Title in Russian", maxLength: 255 })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  titleRu?: string;

  @ApiPropertyOptional({ description: "Body in Russian" })
  @IsOptional()
  @IsString()
  bodyRu?: string;

  @ApiPropertyOptional({ description: "Short body in Russian" })
  @IsOptional()
  @IsString()
  shortBodyRu?: string;

  @ApiPropertyOptional({ description: "HTML body in Russian" })
  @IsOptional()
  @IsString()
  htmlBodyRu?: string;

  // ===== Content (Uzbek) =====

  @ApiPropertyOptional({ description: "Title in Uzbek", maxLength: 255 })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  titleUz?: string;

  @ApiPropertyOptional({ description: "Body in Uzbek" })
  @IsOptional()
  @IsString()
  bodyUz?: string;

  @ApiPropertyOptional({ description: "Short body in Uzbek" })
  @IsOptional()
  @IsString()
  shortBodyUz?: string;

  // ===== Content (English) =====

  @ApiPropertyOptional({ description: "Title in English", maxLength: 255 })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  titleEn?: string;

  @ApiPropertyOptional({ description: "Body in English" })
  @IsOptional()
  @IsString()
  bodyEn?: string;

  // ===== Settings =====

  @ApiPropertyOptional({
    description: "Default delivery channels",
    enum: NotificationChannel,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  defaultChannels?: NotificationChannel[];

  @ApiPropertyOptional({
    description: "Default priority",
    enum: NotificationPriority,
  })
  @IsOptional()
  @IsEnum(NotificationPriority)
  defaultPriority?: NotificationPriority;

  @ApiPropertyOptional({
    description: "Available template variables",
    type: [TemplateVariableDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateVariableDto)
  availableVariables?: TemplateVariableDto[];

  // ===== Action =====

  @ApiPropertyOptional({ description: "Action URL" })
  @IsOptional()
  @IsString()
  actionUrl?: string;

  @ApiPropertyOptional({
    description: "Action button text in Russian",
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  actionTextRu?: string;

  @ApiPropertyOptional({
    description: "Action button text in Uzbek",
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  actionTextUz?: string;

  // ===== Flags =====

  @ApiPropertyOptional({ description: "Whether template is active" })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
