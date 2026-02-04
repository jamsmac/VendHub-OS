/**
 * Order DTOs
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
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
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
} from '../entities/order.entity';

// ============================================================================
// ORDER ITEM DTOs
// ============================================================================

export class OrderItemCustomizationsDto {
  @ApiPropertyOptional({ description: 'Size (S, M, L, XL)' })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiPropertyOptional({ description: 'Sugar level (0-5)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sugar?: number;

  @ApiPropertyOptional({ description: 'Milk type' })
  @IsOptional()
  @IsString()
  milk?: string;

  @ApiPropertyOptional({ description: 'Extra ingredients' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  extras?: string[];
}

export class CreateOrderItemDto {
  @ApiProperty({ description: 'Product ID' })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'Quantity', minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Customizations' })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrderItemCustomizationsDto)
  customizations?: OrderItemCustomizationsDto;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

// ============================================================================
// ORDER DTOs
// ============================================================================

export class CreateOrderDto {
  @ApiPropertyOptional({ description: 'Machine ID' })
  @IsOptional()
  @IsUUID()
  machineId?: string;

  @ApiProperty({ description: 'Order items', type: [CreateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiPropertyOptional({ description: 'Payment method', enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ description: 'Promo code' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  promoCode?: string;

  @ApiPropertyOptional({ description: 'Use bonus points' })
  @IsOptional()
  @IsInt()
  @Min(0)
  usePoints?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ description: 'New status', enum: OrderStatus })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiPropertyOptional({ description: 'Reason (for cancellation)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class UpdatePaymentStatusDto {
  @ApiProperty({ description: 'Payment status', enum: PaymentStatus })
  @IsEnum(PaymentStatus)
  paymentStatus: PaymentStatus;

  @ApiPropertyOptional({ description: 'Payment method', enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}

// ============================================================================
// FILTER DTOs
// ============================================================================

export class OrderFilterDto {
  @ApiPropertyOptional({ description: 'Order status', enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ description: 'Payment status', enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({ description: 'Machine ID' })
  @IsOptional()
  @IsUUID()
  machineId?: string;

  @ApiPropertyOptional({ description: 'User ID' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'From date' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'To date' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ description: 'Search by order number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
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

export class OrderItemDto {
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

  @ApiPropertyOptional()
  customizations?: OrderItemCustomizationsDto;

  @ApiPropertyOptional()
  notes?: string;
}

export class OrderDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  orderNumber: string;

  @ApiProperty()
  userId: string;

  @ApiPropertyOptional()
  userName?: string;

  @ApiPropertyOptional()
  machineId?: string;

  @ApiPropertyOptional()
  machineName?: string;

  @ApiProperty({ enum: OrderStatus })
  status: OrderStatus;

  @ApiProperty({ enum: PaymentStatus })
  paymentStatus: PaymentStatus;

  @ApiPropertyOptional({ enum: PaymentMethod })
  paymentMethod?: PaymentMethod;

  @ApiProperty()
  subtotalAmount: number;

  @ApiProperty()
  discountAmount: number;

  @ApiProperty()
  bonusAmount: number;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty()
  pointsEarned: number;

  @ApiProperty()
  pointsUsed: number;

  @ApiPropertyOptional()
  promoCode?: string;

  @ApiProperty()
  promoDiscount: number;

  @ApiProperty({ type: [OrderItemDto] })
  items: OrderItemDto[];

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional()
  cancellationReason?: string;

  @ApiPropertyOptional()
  confirmedAt?: Date;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiPropertyOptional()
  cancelledAt?: Date;

  @ApiPropertyOptional()
  paidAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class OrderListDto {
  @ApiProperty({ type: [OrderDto] })
  items: OrderDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class OrderStatsDto {
  @ApiProperty()
  totalOrders: number;

  @ApiProperty()
  pendingOrders: number;

  @ApiProperty()
  completedOrders: number;

  @ApiProperty()
  cancelledOrders: number;

  @ApiProperty()
  totalRevenue: number;

  @ApiProperty()
  averageOrderValue: number;

  @ApiProperty()
  totalPointsEarned: number;

  @ApiProperty()
  totalPointsUsed: number;

  @ApiProperty()
  byPaymentMethod: Record<string, { count: number; amount: number }>;
}
