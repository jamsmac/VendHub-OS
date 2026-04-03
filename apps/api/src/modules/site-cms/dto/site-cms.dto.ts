import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsObject,
  Min,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class CreateSiteCmsItemDto {
  @ApiProperty({
    description: "Item payload (full JSON)",
    example: { name: "Espresso", price: 20000 },
  })
  @IsObject()
  data: Record<string, unknown>;

  @ApiPropertyOptional({ description: "Sort order", default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;

  @ApiPropertyOptional({ description: "Active flag", default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSiteCmsItemDto {
  @ApiPropertyOptional({ description: "Partial or full item payload" })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QuerySiteCmsItemsDto {
  @ApiPropertyOptional({ description: "Filter by active status" })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: "Search within data JSON (ILIKE on name)",
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}

export class CreateCooperationRequestDto {
  @ApiProperty({ description: "Partnership model key", example: "franchise" })
  @IsString()
  @MaxLength(100)
  model: string;

  @ApiProperty({ description: "Contact name", example: "John" })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ description: "Phone number", example: "+998901234567" })
  @IsString()
  @MaxLength(50)
  phone: string;

  @ApiPropertyOptional({ description: "Comment" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
