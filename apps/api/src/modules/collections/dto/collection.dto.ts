import {
  IsUUID,
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsDateString,
  IsBoolean,
  Min,
  Max,
  ValidateNested,
  ArrayMaxSize,
} from "class-validator";
import { Type } from "class-transformer";
import {
  CollectionSource,
  CollectionStatus,
} from "../entities/collection.entity";

// ============================================================================
// CREATE (Stage 1 — Operator)
// ============================================================================

export class CreateCollectionDto {
  @IsUUID()
  machineId: string;

  @IsDateString()
  collectedAt: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(CollectionSource)
  source?: CollectionSource;

  @IsOptional()
  @IsBoolean()
  skipDuplicateCheck?: boolean;
}

// ============================================================================
// RECEIVE (Stage 2 — Manager)
// ============================================================================

export class ReceiveCollectionDto {
  @IsNumber()
  @Min(1)
  @Max(1_000_000_000) // 1 billion UZS max
  amount: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ============================================================================
// EDIT (Manager/Admin)
// ============================================================================

export class EditCollectionDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1_000_000_000)
  amount?: number;

  @IsString()
  reason: string; // mandatory audit reason

  @IsOptional()
  @IsString()
  notes?: string;
}

// ============================================================================
// CANCEL
// ============================================================================

export class CancelCollectionDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

// ============================================================================
// BULK CREATE
// ============================================================================

export class BulkCollectionItemDto {
  @IsOptional()
  @IsUUID()
  machineId?: string;

  @IsOptional()
  @IsString()
  machineCode?: string;

  @IsDateString()
  collectedAt: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;
}

export class BulkCreateCollectionDto {
  @ValidateNested({ each: true })
  @Type(() => BulkCollectionItemDto)
  @ArrayMaxSize(1000)
  collections: BulkCollectionItemDto[];

  @IsOptional()
  @IsEnum(CollectionSource)
  source?: CollectionSource;
}

// ============================================================================
// BULK CANCEL
// ============================================================================

export class BulkCancelCollectionDto {
  @IsOptional()
  @IsUUID("4", { each: true })
  @ArrayMaxSize(500)
  ids?: string[];

  @IsOptional()
  @IsBoolean()
  useFilters?: boolean;

  @IsOptional()
  @IsEnum(CollectionStatus)
  status?: CollectionStatus;

  @IsOptional()
  @IsUUID()
  machineId?: string;

  @IsOptional()
  @IsUUID()
  operatorId?: string;

  @IsOptional()
  @IsEnum(CollectionSource)
  source?: CollectionSource;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

// ============================================================================
// QUERY
// ============================================================================

export class CollectionQueryDto {
  @IsOptional()
  @IsEnum(CollectionStatus)
  status?: CollectionStatus;

  @IsOptional()
  @IsUUID()
  machineId?: string;

  @IsOptional()
  @IsUUID()
  operatorId?: string;

  @IsOptional()
  @IsEnum(CollectionSource)
  source?: CollectionSource;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: "ASC" | "DESC";

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;
}
