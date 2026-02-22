import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsUrl,
  IsUUID,
  IsOptional,
  Length,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

class PushKeysDto {
  @ApiProperty({ description: "P-256 Diffie-Hellman public key" })
  @IsString()
  p256dh: string;

  @ApiProperty({ description: "Authentication secret" })
  @IsString()
  auth: string;
}

export class SubscribePushDto {
  @ApiProperty({ description: "Push subscription endpoint URL" })
  @IsUrl()
  endpoint: string;

  @ApiProperty({ description: "Subscription keys", type: PushKeysDto })
  @ValidateNested()
  @Type(() => PushKeysDto)
  keys: PushKeysDto;

  @ApiPropertyOptional({ description: "Browser user agent string" })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  userAgent?: string;
}

export class UnsubscribePushDto {
  @ApiProperty({ description: "Push subscription endpoint URL to remove" })
  @IsString()
  endpoint: string;
}

export class SendPushDto {
  @ApiProperty({ description: "Target user ID" })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: "Notification title", maxLength: 200 })
  @IsString()
  @Length(1, 200)
  title: string;

  @ApiProperty({ description: "Notification body", maxLength: 1000 })
  @IsString()
  @Length(1, 1000)
  body: string;

  @ApiPropertyOptional({ description: "Action URL when notification clicked" })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({ description: "Additional data payload" })
  @IsOptional()
  data?: Record<string, unknown>;
}
