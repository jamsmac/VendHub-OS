import { ApiProperty } from "@nestjs/swagger";
import { Exclude, Expose } from "class-transformer";

/**
 * Base Response DTO
 * All entity responses should extend this
 * Provides standard fields that are safe to expose
 * Uses class-transformer to prevent sensitive data leakage
 */
@Expose()
export class BaseResponseDto {
  @ApiProperty({ description: "Unique identifier", format: "uuid" })
  @Expose()
  id: string;

  @ApiProperty({ description: "Creation timestamp" })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: "Last update timestamp" })
  @Expose()
  updatedAt: Date;

  // Audit fields are EXCLUDED to prevent information disclosure
  @Exclude()
  deletedAt?: Date;

  @Exclude()
  createdById?: string;

  @Exclude()
  updatedById?: string;
}

/**
 * Paginated Response DTO
 * Standard pagination wrapper for list endpoints
 */
export class PaginatedResponseDto<T> {
  @ApiProperty({ description: "Data items", isArray: true })
  data: T[];

  @ApiProperty({ description: "Total count of items" })
  total: number;

  @ApiProperty({ description: "Current page number" })
  page: number;

  @ApiProperty({ description: "Items per page" })
  limit: number;

  @ApiProperty({ description: "Total number of pages" })
  totalPages: number;
}
