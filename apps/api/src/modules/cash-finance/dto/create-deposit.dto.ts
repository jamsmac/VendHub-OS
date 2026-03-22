import {
  IsNumber,
  IsString,
  IsOptional,
  IsDateString,
  Min,
  Max,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateDepositDto {
  @ApiProperty({ description: "Deposit amount in UZS", example: 500000 })
  @IsNumber()
  @Min(1)
  @Max(1_000_000_000)
  amount: number;

  @ApiProperty({
    description: "Date of deposit",
    example: "2026-03-21",
  })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({
    description: "Optional notes",
    example: "Cash from machine #5",
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
