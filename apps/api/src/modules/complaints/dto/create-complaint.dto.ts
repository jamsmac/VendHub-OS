/**
 * Complaint DTOs
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsBoolean,
  IsNumber,
  IsArray,
  IsObject,
  MaxLength,
  IsEmail,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ComplaintCategory {
  MACHINE_NOT_WORKING = 'machine_not_working',
  MACHINE_ERROR = 'machine_error',
  PAYMENT_FAILED = 'payment_failed',
  CARD_NOT_ACCEPTED = 'card_not_accepted',
  CASH_NOT_ACCEPTED = 'cash_not_accepted',
  NO_CHANGE = 'no_change',
  PRODUCT_NOT_DISPENSED = 'product_not_dispensed',
  PRODUCT_STUCK = 'product_stuck',
  WRONG_PRODUCT = 'wrong_product',
  PRODUCT_EXPIRED = 'product_expired',
  PRODUCT_DAMAGED = 'product_damaged',
  PRODUCT_QUALITY = 'product_quality',
  PRODUCT_OUT_OF_STOCK = 'product_out_of_stock',
  REFUND_REQUEST = 'refund_request',
  DOUBLE_CHARGE = 'double_charge',
  CHARGE_WITHOUT_PRODUCT = 'charge_without_product',
  MACHINE_DIRTY = 'machine_dirty',
  HYGIENE_ISSUE = 'hygiene_issue',
  SAFETY_CONCERN = 'safety_concern',
  SUGGESTION = 'suggestion',
  PRODUCT_REQUEST = 'product_request',
  PRICE_FEEDBACK = 'price_feedback',
  OTHER = 'other',
}

export enum ComplaintStatus {
  NEW = 'new',
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  ASSIGNED = 'assigned',
  INVESTIGATING = 'investigating',
  AWAITING_CUSTOMER = 'awaiting_customer',
  AWAITING_PARTS = 'awaiting_parts',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  REJECTED = 'rejected',
  DUPLICATE = 'duplicate',
  ESCALATED = 'escalated',
  REOPENED = 'reopened',
}

export enum ComplaintPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export class CustomerInfoDto {
  @ApiPropertyOptional({ example: 'Иван' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: 'customer@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '123456789' })
  @IsOptional()
  @IsString()
  telegramId?: string;
}

export class CreateComplaintDto {
  @ApiPropertyOptional({ default: 'qr_code' })
  @IsOptional()
  @IsString()
  source?: string = 'qr_code';

  @ApiProperty({ enum: ComplaintCategory, default: ComplaintCategory.OTHER })
  @IsEnum(ComplaintCategory)
  @IsNotEmpty()
  category: ComplaintCategory;

  @ApiPropertyOptional({ enum: ComplaintPriority, default: ComplaintPriority.MEDIUM })
  @IsOptional()
  @IsEnum(ComplaintPriority)
  priority?: ComplaintPriority = ComplaintPriority.MEDIUM;

  @ApiProperty({ example: 'Автомат не работает' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  subject: string;

  @ApiProperty({ example: 'При попытке купить напиток автомат выдал ошибку' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ type: CustomerInfoDto })
  @IsOptional()
  @IsObject()
  customer?: CustomerInfoDto;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean = false;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  machineId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  productInfo?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  transactionInfo?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  geoLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  attachments?: any[];

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateComplaintDto {
  @ApiPropertyOptional({ enum: ComplaintCategory })
  @IsOptional()
  @IsEnum(ComplaintCategory)
  category?: ComplaintCategory;

  @ApiPropertyOptional({ enum: ComplaintStatus })
  @IsOptional()
  @IsEnum(ComplaintStatus)
  status?: ComplaintStatus;

  @ApiPropertyOptional({ enum: ComplaintPriority })
  @IsOptional()
  @IsEnum(ComplaintPriority)
  priority?: ComplaintPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  subject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resolution?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEscalated?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  attachments?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class ResolveComplaintDto {
  @ApiProperty({ example: 'Проблема устранена, возврат оформлен' })
  @IsString()
  @IsNotEmpty()
  resolution: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RateComplaintDto {
  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 'Быстро решили проблему, спасибо!' })
  @IsOptional()
  @IsString()
  feedback?: string;
}

export class QueryComplaintsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  machineId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional({ enum: ComplaintCategory })
  @IsOptional()
  @IsEnum(ComplaintCategory)
  category?: ComplaintCategory;

  @ApiPropertyOptional({ enum: ComplaintStatus })
  @IsOptional()
  @IsEnum(ComplaintStatus)
  status?: ComplaintStatus;

  @ApiPropertyOptional({ enum: ComplaintPriority })
  @IsOptional()
  @IsEnum(ComplaintPriority)
  priority?: ComplaintPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isSlaBreach?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}
