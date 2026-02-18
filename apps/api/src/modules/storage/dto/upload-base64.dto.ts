/**
 * Upload Base64 DTO
 * Used for uploading base64-encoded file data
 */

import { IsString, IsNotEmpty, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UploadBase64Dto {
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
    example: "report-2024.png",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  file_name: string;

  @ApiProperty({
    description:
      "Base64-encoded file data with MIME prefix (e.g. data:image/png;base64,...)",
    example: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...",
  })
  @IsString()
  @IsNotEmpty()
  base64_data: string;
}
