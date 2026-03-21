import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsUUID,
  IsOptional,
  IsString,
  IsNumber,
  IsObject,
  Min,
} from "class-validator";
import { BatchMovementType } from "@vendhub/shared";

export class CreateBatchMovementDto {
  @ApiProperty({ description: "Batch UUID" })
  @IsUUID()
  batchId: string;

  @ApiProperty({ enum: BatchMovementType })
  @IsEnum(BatchMovementType)
  movementType: BatchMovementType;

  @ApiProperty({ description: "Quantity moved", minimum: 0.001 })
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiPropertyOptional({ description: "Container/bunker UUID" })
  @IsOptional()
  @IsUUID()
  containerId?: string;

  @ApiPropertyOptional({ description: "Machine UUID" })
  @IsOptional()
  @IsUUID()
  machineId?: string;

  @ApiPropertyOptional({ description: "Batch mixed with (for MIX type)" })
  @IsOptional()
  @IsUUID()
  mixedWithBatchId?: string;

  @ApiPropertyOptional({ description: "Mix ratio (batch_id → proportion)" })
  @IsOptional()
  @IsObject()
  mixRatio?: Record<string, number>;

  @ApiPropertyOptional({ description: "Notes" })
  @IsOptional()
  @IsString()
  notes?: string;
}
