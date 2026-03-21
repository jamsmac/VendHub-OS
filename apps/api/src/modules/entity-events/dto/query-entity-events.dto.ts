import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsUUID,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";
import { EntityEventType, TrackedEntityType } from "@vendhub/shared";

export class QueryEntityEventsDto {
  @ApiPropertyOptional({ description: "Filter by entity UUID" })
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional({ enum: TrackedEntityType })
  @IsOptional()
  @IsEnum(TrackedEntityType)
  entityType?: TrackedEntityType;

  @ApiPropertyOptional({ enum: EntityEventType })
  @IsOptional()
  @IsEnum(EntityEventType)
  eventType?: EntityEventType;

  @ApiPropertyOptional({ description: "Filter by performer" })
  @IsOptional()
  @IsUUID()
  performedBy?: string;

  @ApiPropertyOptional({ description: "Events from this date" })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: "Events to this date" })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}
