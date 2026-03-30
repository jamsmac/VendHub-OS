/**
 * Complaint Settings DTO
 * SLA configuration, automation, and notification settings for complaints
 */

import {
  IsBoolean,
  IsOptional,
  IsInt,
  Min,
  Max,
  ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class SlaConfigDto {
  @ApiProperty({ description: "Critical priority SLA (hours)", default: 2 })
  @IsInt()
  @Min(1)
  @Max(720)
  critical: number;

  @ApiProperty({ description: "High priority SLA (hours)", default: 8 })
  @IsInt()
  @Min(1)
  @Max(720)
  high: number;

  @ApiProperty({ description: "Medium priority SLA (hours)", default: 24 })
  @IsInt()
  @Min(1)
  @Max(720)
  medium: number;

  @ApiProperty({ description: "Low priority SLA (hours)", default: 72 })
  @IsInt()
  @Min(1)
  @Max(720)
  low: number;
}

export class ComplaintNotificationSettingsDto {
  @ApiPropertyOptional({ description: "Email on new complaint", default: true })
  @IsOptional()
  @IsBoolean()
  emailOnNew?: boolean;

  @ApiPropertyOptional({
    description: "Email on escalation",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  emailOnEscalation?: boolean;

  @ApiPropertyOptional({
    description: "Telegram on new complaint",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  telegramOnNew?: boolean;

  @ApiPropertyOptional({
    description: "Telegram on SLA warning",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  telegramOnSlaWarning?: boolean;

  @ApiPropertyOptional({
    description: "SLA warning percentage threshold",
    default: 80,
  })
  @IsOptional()
  @IsInt()
  @Min(50)
  @Max(95)
  slaWarningPercentage?: number;
}

export class UpdateComplaintSettingsDto {
  @ApiPropertyOptional({ description: "SLA configuration" })
  @IsOptional()
  @ValidateNested()
  @Type(() => SlaConfigDto)
  sla?: SlaConfigDto;

  @ApiPropertyOptional({ description: "Auto-assign complaints" })
  @IsOptional()
  @IsBoolean()
  autoAssign?: boolean;

  @ApiPropertyOptional({ description: "Auto-escalate on SLA breach" })
  @IsOptional()
  @IsBoolean()
  autoEscalate?: boolean;

  @ApiPropertyOptional({ description: "Notification settings" })
  @IsOptional()
  @ValidateNested()
  @Type(() => ComplaintNotificationSettingsDto)
  notifications?: ComplaintNotificationSettingsDto;
}

export class ComplaintSettingsResponseDto {
  @ApiProperty()
  sla: SlaConfigDto;

  @ApiProperty()
  autoAssign: boolean;

  @ApiProperty()
  autoEscalate: boolean;

  @ApiProperty()
  notifications: ComplaintNotificationSettingsDto;
}
