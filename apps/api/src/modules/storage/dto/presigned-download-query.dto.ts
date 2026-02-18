/**
 * Presigned Download Query DTO
 * Used for query parameters when requesting a presigned download URL
 */

import {
  IsString,
  IsOptional,
  IsInt,
  MaxLength,
  Min,
  Max,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class PresignedDownloadQueryDto {
  @ApiPropertyOptional({
    description: "Presigned URL expiration time in seconds",
    default: 3600,
    example: 3600,
    minimum: 60,
    maximum: 86400,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(60)
  @Max(86400)
  expires_in?: number;

  @ApiPropertyOptional({
    description: "Custom file name for the downloaded file",
    example: "my-report.pdf",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  file_name?: string;
}
