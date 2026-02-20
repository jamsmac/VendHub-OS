/**
 * Create Container DTO
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsNumber,
  IsInt,
  IsEnum,
  IsObject,
  MaxLength,
  Min,
  Max,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ContainerStatus } from "../entities/container.entity";

export class CreateContainerDto {
  @ApiProperty({
    description: "Machine UUID this container belongs to",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsUUID()
  @IsNotEmpty()
  machineId: string;

  @ApiPropertyOptional({
    description: "Product/nomenclature UUID loaded in this container",
    example: "123e4567-e89b-12d3-a456-426614174001",
  })
  @IsOptional()
  @IsUUID()
  nomenclatureId?: string;

  @ApiProperty({
    description: "Slot number within the machine (1-50)",
    example: 1,
    minimum: 1,
    maximum: 50,
  })
  @IsInt()
  @Min(1)
  @Max(50)
  slotNumber: number;

  @ApiPropertyOptional({
    description: "Human-readable container name",
    example: "Hopper A1 - Coffee beans",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({
    description: "Maximum capacity of this container",
    example: 1000,
    minimum: 0.001,
  })
  @IsNumber()
  @Min(0.001)
  capacity: number;

  @ApiPropertyOptional({
    description: "Current quantity in the container",
    example: 0,
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  currentQuantity?: number;

  @ApiPropertyOptional({
    description: "Unit of measurement (g, ml, pcs, etc.)",
    example: "g",
    default: "g",
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiPropertyOptional({
    description: "Minimum level threshold for low-stock alerts",
    example: 100,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minLevel?: number;

  @ApiPropertyOptional({
    description: "Container status",
    enum: ContainerStatus,
    example: ContainerStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ContainerStatus)
  status?: ContainerStatus;

  @ApiPropertyOptional({ description: "Additional metadata (JSON)" })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "Free-text notes" })
  @IsOptional()
  @IsString()
  notes?: string;
}
