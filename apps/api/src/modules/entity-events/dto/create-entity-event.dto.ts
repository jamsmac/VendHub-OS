import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsUUID,
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  IsDateString,
  IsObject,
  MaxLength,
} from "class-validator";
import { EntityEventType, TrackedEntityType } from "@vendhub/shared";

export class CreateEntityEventDto {
  @ApiProperty({ description: "Entity UUID" })
  @IsUUID()
  entityId: string;

  @ApiProperty({ enum: TrackedEntityType })
  @IsEnum(TrackedEntityType)
  entityType: TrackedEntityType;

  @ApiProperty({ enum: EntityEventType })
  @IsEnum(EntityEventType)
  eventType: EntityEventType;

  @ApiPropertyOptional({ description: "Event date (defaults to now)" })
  @IsOptional()
  @IsDateString()
  eventDate?: string;

  @ApiPropertyOptional({ description: "Related entity UUID" })
  @IsOptional()
  @IsUUID()
  relatedEntityId?: string;

  @ApiPropertyOptional({ description: "Related event UUID" })
  @IsOptional()
  @IsUUID()
  relatedEventId?: string;

  @ApiPropertyOptional({ description: "Quantity involved" })
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @ApiPropertyOptional({ description: "Document number" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  documentNumber?: string;

  @ApiPropertyOptional({ description: "Notes" })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: "Photo URLs" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @ApiPropertyOptional({ description: "Additional metadata" })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
