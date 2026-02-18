/**
 * Analyze Complaint DTO
 * Used for AI-powered complaint sentiment analysis and priority detection
 */

import { IsString, IsNotEmpty, IsOptional, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AnalyzeComplaintDto {
  @ApiProperty({
    description: "Complaint subject line",
    example: "Автомат не выдал товар",
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  subject: string;

  @ApiProperty({
    description: "Full complaint description text",
    example:
      "Оплатил через Click 15000 сум, но кофе не получил. Автомат показал ошибку E05.",
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    description: "Complaint category for additional context",
    example: "product_not_dispensed",
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;
}
