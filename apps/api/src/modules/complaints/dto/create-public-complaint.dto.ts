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
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ComplaintCategory } from "../entities/complaint.entity";

export class CreatePublicComplaintDto {
  @ApiProperty({
    example: "QR-2024-ABC123",
    description: "QR code scanned from the vending machine",
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  qrCode: string;

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
}
