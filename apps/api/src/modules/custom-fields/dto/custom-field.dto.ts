import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsInt,
  IsArray,
  IsNumber,
  MaxLength,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { CustomFieldType } from "../entities/custom-field.entity";

// ============================================================================
// Custom Tab DTOs
// ============================================================================

export class CreateCustomTabDto {
  @ApiProperty() @IsString() @MaxLength(50) entityType: string;
  @ApiProperty() @IsString() @MaxLength(100) tabName: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tabNameUz?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tabIcon?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  visibilityRoles?: string[];
}

export class UpdateCustomTabDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tabName?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tabNameUz?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tabIcon?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  visibilityRoles?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

// ============================================================================
// Custom Field DTOs
// ============================================================================

export class CreateCustomFieldDto {
  @ApiProperty() @IsString() @MaxLength(50) entityType: string;
  @ApiProperty() @IsString() @MaxLength(100) fieldKey: string;
  @ApiProperty() @IsString() @MaxLength(200) fieldLabel: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  fieldLabelUz?: string;
  @ApiProperty({ enum: CustomFieldType })
  @IsEnum(CustomFieldType)
  fieldType: CustomFieldType;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tabName?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isRequired?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  defaultValue?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  placeholder?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  helpText?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() validationMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() validationMax?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() validationPattern?: string;
}

export class UpdateCustomFieldDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  fieldLabel?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  fieldLabelUz?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(CustomFieldType)
  fieldType?: CustomFieldType;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tabName?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isRequired?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  defaultValue?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  placeholder?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  helpText?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
