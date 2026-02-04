/**
 * Client Order DTOs
 * Validation and Swagger docs for order creation and items
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @ApiProperty({
    description: 'Product UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  productId: string;

  @ApiProperty({
    description: 'Quantity to purchase (minimum 1)',
    example: 2,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateClientOrderDto {
  @ApiPropertyOptional({
    description: 'Machine UUID where the order is placed',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  })
  @IsUUID()
  @IsOptional()
  machineId?: string;

  @ApiProperty({
    description: 'List of items to order',
    type: [OrderItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({
    description: 'Payment provider to use',
    example: 'wallet',
    enum: ['telegram', 'click', 'payme', 'uzum', 'wallet'],
  })
  @IsString()
  @MaxLength(20)
  paymentProvider: string;

  @ApiPropertyOptional({
    description: 'Promo code to apply',
    example: 'SUMMER2024',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  promoCode?: string;

  @ApiPropertyOptional({
    description: 'Number of loyalty points to redeem (minimum 0)',
    example: 100,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  useLoyaltyPoints?: number;
}
