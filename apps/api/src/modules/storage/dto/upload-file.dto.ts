/**
 * Upload File DTO
 * Used for direct file upload via multipart/form-data
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum FileCategory {
  IMAGE = "image",
  DOCUMENT = "document",
  SPREADSHEET = "spreadsheet",
  ANY = "any",
}

export class UploadFileDto {
  @ApiProperty({
    description: "Target folder path for the uploaded file",
    example: "tasks/photos",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  folder: string;

  @ApiPropertyOptional({
    description: "File category for validation (MIME type and size checks)",
    enum: FileCategory,
    default: FileCategory.ANY,
    example: FileCategory.IMAGE,
  })
  @IsOptional()
  @IsEnum(FileCategory)
  category?: FileCategory;
}
