import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  MaxLength,
  ArrayMaxSize,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateTaskCommentDto {
  @ApiProperty({
    example: "Автомат требует промывки перед пополнением",
    description: "Comment text",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  comment: string;

  @ApiPropertyOptional({
    default: false,
    description: "Is internal (admin-only visibility)",
  })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;

  @ApiPropertyOptional({ description: "Attachment URLs" })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  attachments?: string[];
}
