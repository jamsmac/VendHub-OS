import { IsArray, IsOptional, IsObject } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ValidateImportDataDto {
  @ApiProperty({ description: "Rows of import data" })
  @IsArray()
  @IsObject({ each: true })
  rows: Record<string, string | number | boolean | null | undefined>[];

  @ApiPropertyOptional({ description: "Column mapping (source → target)" })
  @IsOptional()
  @IsObject()
  mapping?: Record<string, string>;
}
