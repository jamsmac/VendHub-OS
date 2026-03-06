import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  Max,
  Length,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateInvestorProfileDto {
  @ApiProperty({
    description: "Investor name",
    example: "Investment Fund Alpha",
  })
  @IsString()
  @Length(1, 255)
  name: string;

  @ApiProperty({ description: "Share percentage", example: 15 })
  @IsNumber()
  @Min(0)
  @Max(100)
  sharePercent: number;

  @ApiProperty({
    description: "Total invested amount in UZS",
    example: 500000000,
  })
  @IsNumber()
  @Min(0)
  totalInvested: number;

  @ApiProperty({
    description: "Expected payback period in months",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  paybackMonths?: number;

  @ApiProperty({ description: "Notes", required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
