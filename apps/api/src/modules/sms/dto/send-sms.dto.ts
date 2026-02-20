/**
 * SMS DTOs
 * Data transfer objects for SMS sending operations
 */

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsArray,
  IsEnum,
  IsOptional,
  Length,
  Matches,
  ArrayMinSize,
  ArrayMaxSize,
} from "class-validator";

/**
 * SMS provider enum
 */
export enum SmsProvider {
  ESKIZ = "eskiz",
  PLAYMOBILE = "playmobile",
  MOCK = "mock",
}

/**
 * SMS delivery status
 */
export enum SmsStatus {
  SENT = "sent",
  FAILED = "failed",
  QUEUED = "queued",
  DELIVERED = "delivered",
  NOT_CONFIGURED = "not_configured",
}

/**
 * DTO for sending a single SMS
 */
export class SendSmsDto {
  @ApiProperty({
    description: "Recipient phone number (Uzbek format)",
    example: "998901234567",
  })
  @IsString()
  @Matches(/^(\+?998|998)?[0-9]{9}$/, {
    message: "Phone number must be a valid Uzbek number (e.g. 998901234567)",
  })
  to: string;

  @ApiProperty({
    description: "SMS message text (max 160 chars for single SMS)",
    example: "Your verification code: 1234",
    minLength: 1,
    maxLength: 160,
  })
  @IsString()
  @Length(1, 160)
  message: string;
}

/**
 * DTO for sending bulk SMS
 */
export class BulkSmsDto {
  @ApiProperty({
    description: "Array of recipient phone numbers",
    example: ["998901234567", "998911234567"],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @Matches(/^(\+?998|998)?[0-9]{9}$/, {
    each: true,
    message: "Each phone number must be a valid Uzbek number",
  })
  recipients: string[];

  @ApiProperty({
    description: "SMS message text",
    example: "Important notification from VendHub",
    minLength: 1,
    maxLength: 160,
  })
  @IsString()
  @Length(1, 160)
  message: string;
}

/**
 * SMS response DTO
 */
export class SmsResponseDto {
  @ApiProperty({
    description: "Unique message identifier",
    example: "msg-abc123",
  })
  messageId: string;

  @ApiProperty({
    description: "Delivery status",
    enum: SmsStatus,
    example: SmsStatus.SENT,
  })
  @IsEnum(SmsStatus)
  status: SmsStatus;

  @ApiProperty({
    description: "SMS provider used",
    enum: SmsProvider,
    example: SmsProvider.ESKIZ,
  })
  @IsEnum(SmsProvider)
  provider: SmsProvider;

  @ApiPropertyOptional({
    description: "Error message if sending failed",
    example: "Provider returned error 429",
  })
  @IsOptional()
  @IsString()
  error?: string;
}
