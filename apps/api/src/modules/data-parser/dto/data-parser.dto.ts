import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsInt, Min, Max, IsEnum } from "class-validator";
import { Type } from "class-transformer";

export class ParseOptionsDto {
  @ApiPropertyOptional({ description: "CSV delimiter character", default: "," })
  @IsOptional()
  @IsString()
  delimiter?: string;

  @ApiPropertyOptional({ description: "File encoding", default: "utf-8" })
  @IsOptional()
  @IsString()
  encoding?: string;

  @ApiPropertyOptional({
    description: "Excel sheet index (0-based)",
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sheetIndex?: number;

  @ApiPropertyOptional({
    description: "Header row number (1-based)",
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  headerRow?: number;

  @ApiPropertyOptional({ description: "Maximum rows to parse", default: 10000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  maxRows?: number;
}

export enum RecoveryMode {
  SKIP_ERRORS = "skip_errors",
  BEST_EFFORT = "best_effort",
}

export class RecoverParseDto {
  @ApiPropertyOptional({ description: "Recovery mode", enum: RecoveryMode })
  @IsOptional()
  @IsEnum(RecoveryMode)
  mode?: RecoveryMode;

  @ApiPropertyOptional({ description: "CSV delimiter to try" })
  @IsOptional()
  @IsString()
  delimiter?: string;

  @ApiPropertyOptional({ description: "File encoding to try" })
  @IsOptional()
  @IsString()
  encoding?: string;
}
