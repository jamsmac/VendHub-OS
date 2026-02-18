/**
 * Presigned Upload DTO
 * Used for generating presigned URLs for client-side uploads
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  MaxLength,
  Min,
  Max,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { FileCategory } from "./upload-file.dto";

export class PresignedUploadDto {
  @ApiProperty({
    description: "Target folder path for the uploaded file",
    example: "tasks/photos",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  folder: string;

  @ApiProperty({
    description: "File name with extension",
    example: "report-2024.pdf",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  file_name: string;

  @ApiProperty({
    description: "MIME type of the file",
    example: "application/pdf",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  mime_type: string;

  @ApiPropertyOptional({
    description: "File category for validation (MIME type and size checks)",
    enum: FileCategory,
    default: FileCategory.ANY,
    example: FileCategory.IMAGE,
  })
  @IsOptional()
  @IsEnum(FileCategory)
  category?: FileCategory;

  @ApiPropertyOptional({
    description: "Presigned URL expiration time in seconds",
    default: 3600,
    example: 3600,
    minimum: 60,
    maximum: 86400,
  })
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(86400)
  expires_in_seconds?: number;
}
