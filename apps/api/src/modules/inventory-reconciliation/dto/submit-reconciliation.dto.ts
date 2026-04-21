import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class SubmitReconciliationItemDto {
  @ApiProperty({ description: "Product ID" })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: "Actual counted qty (>= 0)" })
  @IsInt()
  @Min(0)
  actualQty: number;

  @ApiPropertyOptional({ description: "Optional per-item note" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class SubmitReconciliationDto {
  @ApiProperty({ type: [SubmitReconciliationItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SubmitReconciliationItemDto)
  items: SubmitReconciliationItemDto[];
}
