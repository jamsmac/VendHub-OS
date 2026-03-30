import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export enum ReviewAction {
  APPROVE = "approve",
  REJECT = "reject",
}

export class ReviewPayoutRequestDto {
  @ApiProperty({
    description: "Review action",
    enum: ReviewAction,
  })
  @IsEnum(ReviewAction)
  action: ReviewAction;

  @ApiPropertyOptional({
    description: "Reviewer comment (required for rejection)",
    example: "Insufficient documentation",
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
