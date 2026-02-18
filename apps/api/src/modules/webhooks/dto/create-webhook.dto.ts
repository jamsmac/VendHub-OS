/**
 * Create Webhook DTO
 */

import {
  IsUrl,
  IsArray,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsString,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { WebhookEvent } from "../webhooks.service";

export class CreateWebhookDto {
  @ApiProperty({
    example: "https://example.com/webhook",
    description: "Webhook endpoint URL that will receive event payloads",
  })
  @IsUrl({}, { message: "url must be a valid URL" })
  url: string;

  @ApiProperty({
    enum: WebhookEvent,
    isArray: true,
    example: [WebhookEvent.SALE_COMPLETED, WebhookEvent.MACHINE_STATUS_CHANGED],
    description: "List of events to subscribe to",
  })
  @IsArray()
  @IsEnum(WebhookEvent, {
    each: true,
    message: "Each event must be a valid WebhookEvent",
  })
  events: WebhookEvent[];

  @ApiPropertyOptional({
    example: "Sales notifications for accounting system",
    description: "Human-readable description of the webhook purpose",
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    example: true,
    description: "Whether the webhook is active and will receive events",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
