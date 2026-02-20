/**
 * Position DTOs for Employees module
 */

import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsUUID,
  Length,
  IsInt,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

export class CreatePositionDto {
  @ApiProperty({ description: "Position title" })
  @IsString()
  @Length(1, 255)
  title: string;

  @ApiProperty({ description: "Position code" })
  @IsString()
  @Length(1, 50)
  code: string;

  @ApiPropertyOptional({ description: "Position description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "Department ID" })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiProperty({ description: "Position level" })
  @IsString()
  level: string;

  @ApiPropertyOptional({ description: "Minimum salary" })
  @IsOptional()
  @IsNumber()
  minSalary?: number;

  @ApiPropertyOptional({ description: "Maximum salary" })
  @IsOptional()
  @IsNumber()
  maxSalary?: number;

  @ApiPropertyOptional({ description: "Is position active" })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePositionDto extends PartialType(CreatePositionDto) {}

export class QueryPositionsDto {
  @ApiPropertyOptional({ description: "Page number", default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: "Items per page", default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: "Search by title or code" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Filter by department ID" })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ description: "Filter by active status" })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
