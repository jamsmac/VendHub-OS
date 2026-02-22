/**
 * FCM DTOs
 * Data transfer objects for Firebase Cloud Messaging operations
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  MaxLength,
  IsUUID,
  IsObject,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DeviceType } from "../entities/fcm-token.entity";

export class RegisterFcmTokenDto {
  @ApiProperty({
    description: "FCM device token",
    example: "fMRcN0...token",
  })
  @IsString()
  @MaxLength(500)
  token: string;

  @ApiPropertyOptional({
    enum: DeviceType,
    description: "Device type (android, ios, web)",
    example: DeviceType.ANDROID,
  })
  @IsOptional()
  @IsEnum(DeviceType)
  deviceType?: DeviceType;

  @ApiPropertyOptional({
    description: "Device name for identification",
    example: "Samsung Galaxy S21",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceName?: string;
}

export class SendFcmNotificationDto {
  @ApiProperty({ description: "User ID to send notification to" })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: "Notification title" })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: "Notification body" })
  @IsString()
  @MaxLength(1000)
  body: string;

  @ApiPropertyOptional({
    description: "URL to open when notification is clicked",
  })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({ description: "Custom data payload" })
  @IsOptional()
  @IsObject()
  data?: Record<string, string>;
}

export class SubscribeToTopicDto {
  @ApiProperty({ description: "Topic name to subscribe to" })
  @IsString()
  @MaxLength(100)
  topic: string;
}
