/**
 * Machine Access DTOs
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  IsObject,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MachineAccessRole } from "../entities/machine-access.entity";

export class CreateMachineAccessDto {
  @ApiProperty({ description: "Organization ID", example: "uuid" })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiProperty({ description: "Machine ID" })
  @IsUUID()
  @IsNotEmpty()
  machineId: string;

  @ApiProperty({ description: "User ID to grant access to" })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: "Access role",
    enum: MachineAccessRole,
    example: MachineAccessRole.VIEW,
  })
  @IsEnum(MachineAccessRole)
  @IsNotEmpty()
  role: MachineAccessRole;

  @ApiPropertyOptional({ description: "Start date for access validity" })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional({ description: "End date for access validity" })
  @IsOptional()
  @IsDateString()
  validTo?: string;

  @ApiPropertyOptional({ description: "Notes about this access grant" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ description: "Additional metadata" })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class RevokeMachineAccessDto {
  @ApiProperty({ description: "Machine access record ID to revoke" })
  @IsUUID()
  @IsNotEmpty()
  accessId: string;

  @ApiPropertyOptional({ description: "Reason for revoking access" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class BulkGrantAccessDto {
  @ApiProperty({ description: "Machine ID" })
  @IsUUID()
  @IsNotEmpty()
  machineId: string;

  @ApiProperty({ description: "User IDs to grant access to", type: [String] })
  @IsUUID("4", { each: true })
  @IsNotEmpty()
  userIds: string[];

  @ApiProperty({
    description: "Access role",
    enum: MachineAccessRole,
    example: MachineAccessRole.VIEW,
  })
  @IsEnum(MachineAccessRole)
  @IsNotEmpty()
  role: MachineAccessRole;

  @ApiPropertyOptional({ description: "Start date for access validity" })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional({ description: "End date for access validity" })
  @IsOptional()
  @IsDateString()
  validTo?: string;
}
