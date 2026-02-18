/**
 * Copy File DTO
 * Used for copying a file from one key to another
 */

import { IsString, IsNotEmpty, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CopyFileDto {
  @ApiProperty({
    description: "Source file key",
    example: "org-id/tasks/photos/image-123.png",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  source_key: string;

  @ApiProperty({
    description: "Destination file key",
    example: "org-id/archive/photos/image-123.png",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  destination_key: string;
}
