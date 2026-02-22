import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  Min,
  Max,
  Length,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ResolveComplaintDto {
  @ApiProperty({ description: "Resolution description" })
  @IsString()
  @Length(1, 1000)
  resolution: string;
}

export class EscalateComplaintDto {
  @ApiProperty({ description: "Escalation reason" })
  @IsString()
  @Length(1, 500)
  reason: string;
}

export class SubmitFeedbackDto {
  @ApiProperty({ description: "Rating (1-5)" })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: "Optional comment" })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  comment?: string;
}

export class AddCommentDto {
  @ApiProperty({ description: "Comment content" })
  @IsString()
  @Length(1, 2000)
  content: string;

  @ApiPropertyOptional({ description: "Internal comment flag", default: false })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;

  @ApiPropertyOptional({
    description: "Attachment URLs",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}

export class ProcessRefundReferenceDto {
  @ApiProperty({ description: "Payment reference number" })
  @IsString()
  @Length(1, 255)
  referenceNumber: string;
}

export class RejectRefundReasonDto {
  @ApiProperty({ description: "Rejection reason" })
  @IsString()
  @Length(1, 500)
  reason: string;
}
