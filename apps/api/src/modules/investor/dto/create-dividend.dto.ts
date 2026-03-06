import {
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  IsDateString,
  Min,
  Length,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateDividendDto {
  @ApiProperty({ description: "Investor profile ID" })
  @IsUUID()
  investorProfileId: string;

  @ApiProperty({ description: "Period label", example: "Q1 2026" })
  @IsString()
  @Length(1, 20)
  period: string;

  @ApiProperty({ description: "Payment date", example: "2026-04-01" })
  @IsDateString()
  paymentDate: string;

  @ApiProperty({ description: "Dividend amount in UZS", example: 15000000 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: "Notes", required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
