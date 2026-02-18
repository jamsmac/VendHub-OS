/**
 * Delete Files DTO
 * Used for bulk file deletion
 */

import {
  IsArray,
  IsString,
  IsNotEmpty,
  ArrayMinSize,
  ArrayMaxSize,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class DeleteFilesDto {
  @ApiProperty({
    description: "Array of file keys to delete",
    type: [String],
    example: [
      "org-id/tasks/photos/image-123.png",
      "org-id/tasks/photos/image-456.jpg",
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  keys: string[];
}
