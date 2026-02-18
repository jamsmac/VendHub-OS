/**
 * Create Snapshot DTO
 * Used for creating entity snapshots for compliance and point-in-time recovery
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsObject,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateSnapshotDto {
  @ApiProperty({
    description: "Organization ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsUUID()
  @IsNotEmpty()
  organization_id: string;

  @ApiProperty({
    description: "Entity type (table name)",
    example: "users",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  entity_type: string;

  @ApiProperty({
    description: "Entity ID to snapshot",
    example: "550e8400-e29b-41d4-a716-446655440002",
  })
  @IsUUID()
  @IsNotEmpty()
  entity_id: string;

  @ApiProperty({
    description: "Complete entity snapshot data",
    example: { name: "Product A", price: 10000, status: "active" },
  })
  @IsObject()
  @IsNotEmpty()
  snapshot: Record<string, unknown>;

  @ApiPropertyOptional({
    description: "Display name of the entity",
    example: "Product A",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  entity_name?: string;

  @ApiPropertyOptional({
    description: "Reason for creating the snapshot",
    example: "before_price_update",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  snapshot_reason?: string;
}
