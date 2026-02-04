/**
 * Material Request DTOs
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  MaxLength,
  IsInt,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  MaterialRequestStatus,
  RequestPriority,
} from '../entities/material-request.entity';

// ============================================================================
// REQUEST ITEM DTOs
// ============================================================================

export class CreateMaterialRequestItemDto {
  @ApiProperty({ description: 'Product ID' })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'Product name' })
  @IsString()
  @MaxLength(255)
  productName: string;

  @ApiPropertyOptional({ description: 'Product SKU' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  productSku?: string;

  @ApiProperty({ description: 'Quantity', minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Unit price' })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateMaterialRequestItemDto {
  @ApiProperty({ description: 'Item ID' })
  @IsUUID()
  id: string;

  @ApiPropertyOptional({ description: 'Quantity' })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Unit price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

// ============================================================================
// MATERIAL REQUEST DTOs
// ============================================================================

export class CreateMaterialRequestDto {
  @ApiPropertyOptional({ description: 'Supplier ID' })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional({
    description: 'Priority',
    enum: RequestPriority,
    default: RequestPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(RequestPriority)
  priority?: RequestPriority;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiProperty({ description: 'Request items', type: [CreateMaterialRequestItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMaterialRequestItemDto)
  items: CreateMaterialRequestItemDto[];
}

export class UpdateMaterialRequestDto {
  @ApiPropertyOptional({ description: 'Supplier ID' })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional({ description: 'Priority', enum: RequestPriority })
  @IsOptional()
  @IsEnum(RequestPriority)
  priority?: RequestPriority;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Items to add', type: [CreateMaterialRequestItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMaterialRequestItemDto)
  addItems?: CreateMaterialRequestItemDto[];

  @ApiPropertyOptional({ description: 'Items to update', type: [UpdateMaterialRequestItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateMaterialRequestItemDto)
  updateItems?: UpdateMaterialRequestItemDto[];

  @ApiPropertyOptional({ description: 'Item IDs to remove' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  removeItemIds?: string[];
}

// ============================================================================
// WORKFLOW DTOs
// ============================================================================

export class SubmitRequestDto {
  @ApiPropertyOptional({ description: 'Comment' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

export class ApproveRequestDto {
  @ApiPropertyOptional({ description: 'Comment' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

export class RejectRequestDto {
  @ApiProperty({ description: 'Rejection reason' })
  @IsString()
  @MaxLength(1000)
  reason: string;
}

export class SendToSupplierDto {
  @ApiPropertyOptional({ description: 'Comment' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

export class RecordPaymentDto {
  @ApiProperty({ description: 'Payment amount' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ description: 'Payment method' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Payment reference' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class ConfirmDeliveryDto {
  @ApiProperty({ description: 'Delivered items' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliveredItemDto)
  items: DeliveredItemDto[];

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class DeliveredItemDto {
  @ApiProperty({ description: 'Item ID' })
  @IsUUID()
  itemId: string;

  @ApiProperty({ description: 'Delivered quantity' })
  @IsInt()
  @Min(0)
  deliveredQuantity: number;
}

export class CancelRequestDto {
  @ApiProperty({ description: 'Cancellation reason' })
  @IsString()
  @MaxLength(1000)
  reason: string;
}

// ============================================================================
// FILTER DTOs
// ============================================================================

export class MaterialRequestFilterDto {
  @ApiPropertyOptional({ description: 'Status', enum: MaterialRequestStatus })
  @IsOptional()
  @IsEnum(MaterialRequestStatus)
  status?: MaterialRequestStatus;

  @ApiPropertyOptional({ description: 'Priority', enum: RequestPriority })
  @IsOptional()
  @IsEnum(RequestPriority)
  priority?: RequestPriority;

  @ApiPropertyOptional({ description: 'Requester ID' })
  @IsOptional()
  @IsUUID()
  requesterId?: string;

  @ApiPropertyOptional({ description: 'Supplier ID' })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional({ description: 'From date' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'To date' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ description: 'Search query' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export class MaterialRequestItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  productId: string;

  @ApiProperty()
  productName: string;

  @ApiPropertyOptional()
  productSku?: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  unitPrice: number;

  @ApiProperty()
  totalPrice: number;

  @ApiProperty()
  deliveredQuantity: number;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  createdAt: Date;
}

export class MaterialRequestDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  requestNumber: string;

  @ApiProperty()
  requesterId: string;

  @ApiPropertyOptional()
  requesterName?: string;

  @ApiProperty({ enum: MaterialRequestStatus })
  status: MaterialRequestStatus;

  @ApiProperty({ enum: RequestPriority })
  priority: RequestPriority;

  @ApiPropertyOptional()
  supplierId?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty()
  paidAmount: number;

  @ApiPropertyOptional()
  approvedBy?: string;

  @ApiPropertyOptional()
  approverName?: string;

  @ApiPropertyOptional()
  approvedAt?: Date;

  @ApiPropertyOptional()
  rejectionReason?: string;

  @ApiPropertyOptional()
  submittedAt?: Date;

  @ApiPropertyOptional()
  sentAt?: Date;

  @ApiPropertyOptional()
  deliveredAt?: Date;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiPropertyOptional()
  cancelledAt?: Date;

  @ApiPropertyOptional()
  rejectedBy?: string;

  @ApiPropertyOptional()
  cancellationReason?: string;

  @ApiProperty({ type: [MaterialRequestItemDto] })
  items: MaterialRequestItemDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class MaterialRequestListDto {
  @ApiProperty({ type: [MaterialRequestDto] })
  items: MaterialRequestDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class MaterialRequestStatsDto {
  @ApiProperty()
  totalRequests: number;

  @ApiProperty()
  draftCount: number;

  @ApiProperty()
  pendingApprovalCount: number;

  @ApiProperty()
  approvedCount: number;

  @ApiProperty()
  rejectedCount: number;

  @ApiProperty()
  completedCount: number;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty()
  paidAmount: number;

  @ApiProperty()
  unpaidAmount: number;
}
