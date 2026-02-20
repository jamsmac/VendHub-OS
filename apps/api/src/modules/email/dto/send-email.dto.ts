import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsEmail,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  Length,
} from "class-validator";
import { Type } from "class-transformer";

/**
 * DTO for sending a basic email
 */
export class SendEmailDto {
  @ApiProperty({
    description: "Recipient email address(es)",
    example: "user@example.com",
    oneOf: [
      { type: "string", format: "email" },
      { type: "array", items: { type: "string", format: "email" } },
    ],
  })
  @IsEmail({}, { each: true })
  to: string | string[];

  @ApiProperty({
    description: "Email subject line",
    example: "Уведомление VendHub",
    maxLength: 500,
  })
  @IsString()
  @Length(1, 500)
  subject: string;

  @ApiPropertyOptional({
    description: "Plain text email body",
    example: "Здравствуйте! Это уведомление от VendHub.",
  })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({
    description: "HTML email body",
    example: "<h1>Добро пожаловать!</h1>",
  })
  @IsOptional()
  @IsString()
  html?: string;
}

/**
 * DTO for an email attachment
 */
export class EmailAttachmentDto {
  @ApiProperty({
    description: "Attachment filename",
    example: "report.pdf",
  })
  @IsString()
  @Length(1, 255)
  filename: string;

  @ApiPropertyOptional({
    description: "File path on disk",
    example: "/tmp/report.pdf",
  })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiPropertyOptional({
    description: "File content as base64 or utf-8 string",
  })
  @IsOptional()
  @IsString()
  content?: string;
}

/**
 * DTO for sending an email with attachments
 */
export class SendEmailWithAttachmentsDto extends SendEmailDto {
  @ApiProperty({
    description: "Email attachments",
    type: [EmailAttachmentDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EmailAttachmentDto)
  attachments: EmailAttachmentDto[];
}
