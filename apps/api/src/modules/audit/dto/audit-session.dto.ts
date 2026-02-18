/**
 * Audit Session DTOs
 * Used for session management operations (end session, mark suspicious, etc.)
 */

import { IsString, IsOptional, IsBoolean, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";

/**
 * DTO for ending a session
 */
export class EndSessionDto {
  @ApiPropertyOptional({
    description: "Reason for ending the session",
    example: "admin_forced",
    default: "admin_forced",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reason?: string;
}

/**
 * DTO for terminating all user sessions
 */
export class TerminateAllSessionsDto {
  @ApiPropertyOptional({
    description: "Reason for terminating all sessions",
    example: "security_concern",
    default: "admin_forced",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reason?: string;
}

/**
 * DTO for marking a session as suspicious
 */
export class MarkSessionSuspiciousDto {
  @ApiProperty({
    description: "Reason for marking the session as suspicious",
    example: "Login from unusual location",
  })
  @IsString()
  @MaxLength(1000)
  reason: string;
}

/**
 * Query DTO for getting user sessions
 */
export class QueryUserSessionsDto {
  @ApiPropertyOptional({
    description: "Filter to show only active sessions",
    default: true,
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  })
  @IsBoolean()
  active_only?: boolean = true;
}
