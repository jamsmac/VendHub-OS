/**
 * DTO for public complaint creation via QR code
 * Used by unauthenticated users scanning QR codes on vending machines
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  MaxLength,
  IsEmail,
  Length,
  IsArray,
  ValidateIf,
  Matches,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ComplaintCategory } from "../entities/complaint.entity";

const MACHINE_ID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export class CreatePublicComplaintDto {
  @ApiPropertyOptional({
    example: "QR-2024-ABC123",
    description: "QR code scanned from the vending machine",
  })
  @ValidateIf((o) => !o.machineId)
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  qrCode?: string;

  @ApiPropertyOptional({
    example: "9e7e1467-a7e3-4ff5-9f4f-37b3dfe0d868",
    description:
      "Machine ID when complaint is started from the mobile app (accepts UUID-like production ids)",
  })
  @ValidateIf((o) => !o.qrCode)
  @Matches(MACHINE_ID_PATTERN, {
    message: "machineId must be a valid machine identifier",
  })
  machineId?: string;

  @ApiPropertyOptional({
    example: "Иван Петров",
    description: "Customer name",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  customerName?: string;

  @ApiPropertyOptional({
    example: "+998901234567",
    description: "Customer phone number",
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  customerPhone?: string;

  @ApiPropertyOptional({
    example: "customer@example.com",
    description: "Customer email address",
  })
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @ApiProperty({
    enum: ComplaintCategory,
    example: ComplaintCategory.PRODUCT_NOT_DISPENSED,
    description: "Complaint category",
  })
  @IsEnum(ComplaintCategory)
  @IsNotEmpty()
  category: ComplaintCategory;

  @ApiProperty({
    example: "Товар не выдан",
    description: "Short complaint subject",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  subject: string;

  @ApiProperty({
    example: "При попытке купить воду автомат принял оплату, но товар не выдал",
    description: "Detailed complaint description",
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    type: [String],
    description: "Optional pre-uploaded attachment URLs",
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}
