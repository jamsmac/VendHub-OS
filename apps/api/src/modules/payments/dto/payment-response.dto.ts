import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Exclude, Expose } from "class-transformer";
import { BaseResponseDto } from "../../../common/dto";
import {
  PaymentProvider,
  PaymentTransactionStatus,
} from "../entities/payment-transaction.entity";

/**
 * Payment Transaction Response DTO
 * Safe representation of payment transactions
 * EXCLUDES: raw request/response payloads (may contain sensitive payment data)
 */
@Expose()
export class PaymentTransactionResponseDto extends BaseResponseDto {
  @ApiProperty({ description: "Organization ID" })
  @Expose()
  organization_id: string;

  @ApiProperty({
    description: "Payment provider",
    enum: PaymentProvider,
  })
  @Expose()
  provider: PaymentProvider;

  @ApiPropertyOptional({ description: "Payment provider transaction ID" })
  @Expose()
  provider_tx_id?: string;

  @ApiProperty({ description: "Transaction amount (UZS)" })
  @Expose()
  amount: number;

  @ApiProperty({ description: "Currency code" })
  @Expose()
  currency: string;

  @ApiProperty({
    description: "Transaction status",
    enum: PaymentTransactionStatus,
  })
  @Expose()
  status: PaymentTransactionStatus;

  @ApiPropertyOptional({ description: "Associated order ID" })
  @Expose()
  order_id?: string;

  @ApiPropertyOptional({ description: "Associated machine ID" })
  @Expose()
  machine_id?: string;

  @ApiPropertyOptional({ description: "Client/user ID" })
  @Expose()
  client_user_id?: string;

  @ApiPropertyOptional({ description: "Error message if transaction failed" })
  @Expose()
  error_message?: string;

  @ApiPropertyOptional({ description: "Processing timestamp" })
  @Expose()
  processed_at?: Date;

  @ApiProperty({
    description: "Metadata",
    type: "object",
    nullable: true,
    additionalProperties: true,
  })
  @Expose()
  metadata?: Record<string, unknown>;

  @Exclude()
  raw_request?: Record<string, unknown>; // Raw API request - may contain sensitive data

  @Exclude()
  raw_response?: Record<string, unknown>; // Raw API response - may contain sensitive data

  @Exclude()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  refunds?: any[]; // Related refunds excluded in base response
}

/**
 * Payment Refund Response DTO
 */
@Expose()
export class PaymentRefundResponseDto extends BaseResponseDto {
  @ApiProperty({ description: "Payment transaction ID" })
  @Expose()
  payment_transaction_id: string;

  @ApiPropertyOptional({ description: "Refund provider transaction ID" })
  @Expose()
  provider_refund_id?: string;

  @ApiProperty({ description: "Refund amount (UZS)" })
  @Expose()
  amount: number;

  @ApiProperty({
    description: "Refund status",
    enum: ["pending", "completed", "failed", "cancelled"],
  })
  @Expose()
  status: "pending" | "completed" | "failed" | "cancelled";

  @ApiPropertyOptional({ description: "Refund reason" })
  @Expose()
  reason?: string;

  @ApiPropertyOptional({ description: "Error message if refund failed" })
  @Expose()
  error_message?: string;

  @ApiPropertyOptional({ description: "Refund completion timestamp" })
  @Expose()
  processed_at?: Date;

  @ApiProperty({
    description: "Metadata",
    type: "object",
    nullable: true,
    additionalProperties: true,
  })
  @Expose()
  metadata?: Record<string, unknown>;

  @Exclude()
  raw_request?: Record<string, unknown>; // Raw API request

  @Exclude()
  raw_response?: Record<string, unknown>; // Raw API response

  @Exclude()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payment_transaction?: any; // Related transaction
}

/**
 * Payment Webhook Response DTO
 * For webhook notifications - minimal exposure of payment data
 */
@Expose()
export class PaymentWebhookResponseDto {
  @ApiProperty({ description: "Webhook event type" })
  @Expose()
  event: string;

  @ApiProperty({ description: "Transaction ID" })
  @Expose()
  transaction_id: string;

  @ApiProperty({ description: "Transaction status" })
  @Expose()
  status: PaymentTransactionStatus;

  @ApiProperty({ description: "Amount" })
  @Expose()
  amount: number;

  @ApiProperty({ description: "Timestamp" })
  @Expose()
  timestamp: Date;

  @Exclude()
  raw_payload?: Record<string, unknown>;
}
