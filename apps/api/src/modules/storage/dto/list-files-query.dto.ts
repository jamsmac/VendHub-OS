/**
 * List Files Query DTO
 * Used for query parameters when listing files in a folder
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  MaxLength,
  Min,
  Max,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class ListFilesQueryDto {
  @ApiProperty({
    description: "Folder path to list files from",
    example: "tasks/photos",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  folder: string;

  @ApiPropertyOptional({
    description: "Maximum number of files to return",
    default: 1000,
    example: 100,
    minimum: 1,
    maximum: 10000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  max_files?: number;
}
