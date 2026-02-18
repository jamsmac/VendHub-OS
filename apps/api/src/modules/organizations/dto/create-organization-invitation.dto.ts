import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsEnum,
  IsEmail,
  IsUUID,
  IsObject,
  MaxLength,
  IsDateString,
} from "class-validator";
import { UserRole } from "../../../common/enums";
import { InvitationStatus } from "../entities/organization.entity";

// ============================================================================
// CREATE ORGANIZATION INVITATION DTO
// ============================================================================

export class CreateOrganizationInvitationDto {
  @ApiProperty({
    example: "uuid-of-organization",
    description: "Organization ID to invite user to",
  })
  @IsUUID()
  organization_id: string;

  @ApiProperty({
    example: "user@example.com",
    description: "Email of the invited user",
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    example: "Alisher",
    description: "First name of invitee",
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  first_name?: string;

  @ApiPropertyOptional({
    example: "Karimov",
    description: "Last name of invitee",
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  last_name?: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.OPERATOR,
    description: "Role to assign to the invited user",
  })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional({
    example: "Welcome to our team!",
    description: "Personal message from inviter",
  })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({
    example: "2025-02-01T00:00:00Z",
    description: "Invitation expiry date (defaults to 7 days from creation)",
  })
  @IsOptional()
  @IsDateString()
  expires_at?: string;

  @ApiPropertyOptional({ example: {}, description: "Additional metadata" })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

// ============================================================================
// UPDATE INVITATION STATUS DTO
// ============================================================================

export class UpdateInvitationStatusDto {
  @ApiProperty({
    enum: InvitationStatus,
    example: InvitationStatus.CANCELLED,
    description: "New invitation status",
  })
  @IsEnum(InvitationStatus)
  status: InvitationStatus;
}
