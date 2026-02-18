/**
 * Test Webhook DTO
 */

import { IsOptional, IsObject, IsEnum } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { WebhookEvent } from "../webhooks.service";

export class TestWebhookDto {
  @ApiProperty({
    enum: WebhookEvent,
    example: WebhookEvent.MACHINE_STATUS_CHANGED,
    description: "Event type to simulate in the test webhook delivery",
  })
  @IsEnum(WebhookEvent)
  event: WebhookEvent;

  @ApiPropertyOptional({
    description: "Custom payload to include in the test webhook delivery",
    example: {
      machine_id: "123e4567-e89b-12d3-a456-426614174000",
      status: "online",
    },
  })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
