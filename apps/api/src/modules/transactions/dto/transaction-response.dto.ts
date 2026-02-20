import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Exclude, Expose } from "class-transformer";
import { BaseResponseDto } from "../../../common/dto";
import {
  TransactionType,
  TransactionStatus,
  PaymentMethod,
  ExpenseCategory,
  CommissionStatus,
} from "../entities/transaction.entity";

/**
 * Transaction Response DTO
 * Safe representation of Transaction entity
 * Excludes: card holder names, full card numbers (only masked), sensitive personal data
 */
@Expose()
export class TransactionResponseDto extends BaseResponseDto {
  @ApiProperty({ description: "Organization ID" })
  @Expose()
  organizationId: string;

  @ApiPropertyOptional({ description: "Machine ID where transaction occurred" })
  @Expose()
  machineId?: string;

  @ApiProperty({ description: "Transaction number" })
  @Expose()
  transactionNumber?: string;

  @ApiProperty({ description: "Transaction type", enum: TransactionType })
  @Expose()
  type: TransactionType;

  @ApiProperty({
    description: "Transaction status",
    enum: TransactionStatus,
  })
  @Expose()
  status: TransactionStatus;

  @ApiProperty({
    description: "Payment method",
    enum: PaymentMethod,
  })
  @Expose()
  paymentMethod: PaymentMethod;

  @ApiProperty({ description: "Transaction amount (UZS)" })
  @Expose()
  amount: number;

  @ApiProperty({ description: "VAT amount (UZS)" })
  @Expose()
  vatAmount: number;

  @ApiProperty({ description: "Discount amount (UZS)" })
  @Expose()
  discountAmount: number;

  @ApiProperty({ description: "Total amount (UZS)" })
  @Expose()
  totalAmount: number;

  @ApiProperty({ description: "Currency" })
  @Expose()
  currency: string;

  @ApiProperty({ description: "Exchange rate" })
  @Expose()
  exchangeRate: number;

  @ApiProperty({ description: "Transaction timestamp" })
  @Expose()
  transactionDate: Date;

  @ApiPropertyOptional({ description: "Sale date for grouping" })
  @Expose()
  saleDate?: Date;

  @ApiPropertyOptional({ description: "External payment system ID" })
  @Expose()
  paymentId?: string;

  @ApiPropertyOptional({ description: "Payment reference" })
  @Expose()
  paymentReference?: string;

  @ApiPropertyOptional({
    description: "Masked card number (e.g., **** **** **** 1234)",
  })
  @Expose()
  cardMask?: string;

  @ApiPropertyOptional({ description: "Card type (visa, mastercard, etc.)" })
  @Expose()
  cardType?: string;

  @ApiPropertyOptional({ description: "Operator/cashier user ID" })
  @Expose()
  userId?: string;

  @ApiPropertyOptional({ description: "Recipe ID for sales" })
  @Expose()
  recipeId?: string;

  @ApiPropertyOptional({ description: "Recipe snapshot ID" })
  @Expose()
  recipeSnapshotId?: string;

  @ApiPropertyOptional({ description: "Recipe version" })
  @Expose()
  recipeVersion?: number;

  @ApiProperty({ description: "Quantity of portions" })
  @Expose()
  quantity: number;

  @ApiPropertyOptional({ description: "Associated task ID" })
  @Expose()
  taskId?: string;

  @ApiPropertyOptional({
    description: "Counterparty ID (supplier for expenses)",
  })
  @Expose()
  counterpartyId?: string;

  @ApiPropertyOptional({ description: "Associated contract ID" })
  @Expose()
  contractId?: string;

  @ApiPropertyOptional({
    description: "Expense category",
    enum: ExpenseCategory,
  })
  @Expose()
  expenseCategory?: ExpenseCategory;

  @ApiPropertyOptional({ description: "Fiscal signature" })
  @Expose()
  fiscalSign?: string;

  @ApiPropertyOptional({ description: "Fiscal receipt number" })
  @Expose()
  fiscalReceiptNumber?: string;

  @ApiPropertyOptional({ description: "Fiscal receipt URL" })
  @Expose()
  fiscalReceiptUrl?: string;

  @ApiPropertyOptional({ description: "Fiscal QR code" })
  @Expose()
  fiscalQrCode?: string;

  @ApiPropertyOptional({ description: "Fiscal registration timestamp" })
  @Expose()
  fiscalizedAt?: Date;

  @ApiProperty({ description: "Is fiscalized" })
  @Expose()
  isFiscalized: boolean;

  @ApiProperty({
    description: "Fiscal data",
    type: "object",
    nullable: true,
    additionalProperties: true,
  })
  @Expose()
  fiscalData?: {
    terminalId?: string;
    serialNumber?: string;
    shift?: number;
    documentNumber?: number;
    checkNumber?: number;
    ofdId?: string;
    ofdName?: string;
    rawResponse?: Record<string, unknown>;
  };

  @ApiPropertyOptional({ description: "Original transaction ID for refunds" })
  @Expose()
  originalTransactionId?: string;

  @ApiPropertyOptional({ description: "Refunded amount" })
  @Expose()
  refundedAmount?: number;

  @ApiPropertyOptional({ description: "Refund timestamp" })
  @Expose()
  refundedAt?: Date;

  @ApiPropertyOptional({ description: "Refund reason" })
  @Expose()
  refundReason?: string;

  @ApiPropertyOptional({ description: "User ID who performed refund" })
  @Expose()
  refundedByUserId?: string;

  @ApiPropertyOptional({ description: "Machine slot ID" })
  @Expose()
  machineSlotId?: string;

  @ApiPropertyOptional({ description: "Vending session ID" })
  @Expose()
  vendingSessionId?: string;

  @ApiProperty({
    description: "Telemetry data at time of transaction",
    type: "object",
    nullable: true,
    additionalProperties: true,
  })
  @Expose()
  telemetryData?: {
    dispenseDuration?: number;
    temperature?: number;
    errorCodes?: string[];
    clientIp?: string;
    userAgent?: string;
  };

  @ApiPropertyOptional({ description: "Description" })
  @Expose()
  description?: string;

  @ApiPropertyOptional({ description: "Notes" })
  @Expose()
  notes?: string;

  @ApiProperty({
    description: "Metadata",
    type: "object",
    additionalProperties: true,
  })
  @Expose()
  metadata: Record<string, unknown>;

  @ApiProperty({ description: "Is refundable (computed)" })
  @Expose()
  get isRefundable(): boolean {
    return (
      this.type === TransactionType.SALE &&
      this.status === TransactionStatus.COMPLETED &&
      !this.refundedAt
    );
  }

  @ApiProperty({ description: "Net amount (computed)" })
  @Expose()
  get netAmount(): number {
    return this.totalAmount - (this.refundedAmount || 0);
  }

  // Relations excluded
  @Exclude()
  items?: Record<string, unknown>[];

  @Exclude()
  machine?: Record<string, unknown>;

  @Exclude()
  originalTransaction?: Record<string, unknown>;
}

/**
 * Transaction Item Response DTO
 */
@Expose()
export class TransactionItemResponseDto extends BaseResponseDto {
  @ApiProperty({ description: "Transaction ID" })
  @Expose()
  transactionId: string;

  @ApiProperty({ description: "Product ID" })
  @Expose()
  productId: string;

  @ApiProperty({ description: "Product name" })
  @Expose()
  productName: string;

  @ApiPropertyOptional({ description: "Product SKU" })
  @Expose()
  sku?: string;

  @ApiProperty({ description: "Quantity sold" })
  @Expose()
  quantity: number;

  @ApiProperty({ description: "Unit price (UZS)" })
  @Expose()
  unitPrice: number;

  @ApiProperty({ description: "VAT rate (%)" })
  @Expose()
  vatRate: number;

  @ApiProperty({ description: "VAT amount (UZS)" })
  @Expose()
  vatAmount: number;

  @ApiProperty({ description: "Discount amount (UZS)" })
  @Expose()
  discountAmount: number;

  @ApiProperty({ description: "Total amount (UZS)" })
  @Expose()
  totalAmount: number;

  @ApiPropertyOptional({ description: "MXIK tax code" })
  @Expose()
  mxikCode?: string;

  @ApiPropertyOptional({ description: "IKPU tax code" })
  @Expose()
  ikpuCode?: string;

  @ApiPropertyOptional({ description: "Package type" })
  @Expose()
  packageType?: string;

  @ApiPropertyOptional({ description: "Mark code for mandatory marking" })
  @Expose()
  markCode?: string;

  @ApiPropertyOptional({ description: "Slot number in machine" })
  @Expose()
  slotNumber?: string;

  @ApiProperty({
    description: "Metadata",
    type: "object",
    additionalProperties: true,
  })
  @Expose()
  metadata: Record<string, unknown>;

  @Exclude()
  transaction?: Record<string, unknown>;
}

/**
 * Collection Record Response DTO
 */
@Expose()
export class CollectionRecordResponseDto extends BaseResponseDto {
  @ApiProperty({ description: "Organization ID" })
  @Expose()
  organizationId: string;

  @ApiProperty({ description: "Machine ID" })
  @Expose()
  machineId: string;

  @ApiPropertyOptional({ description: "Associated task ID" })
  @Expose()
  taskId?: string;

  @ApiPropertyOptional({ description: "Associated transaction ID" })
  @Expose()
  transactionId?: string;

  @ApiProperty({ description: "User ID who collected" })
  @Expose()
  collectedByUserId: string;

  @ApiProperty({ description: "Cash amount collected (UZS)" })
  @Expose()
  cashAmount: number;

  @ApiProperty({ description: "Coin amount collected (UZS)" })
  @Expose()
  coinAmount: number;

  @ApiProperty({ description: "Total amount collected (UZS)" })
  @Expose()
  totalAmount: number;

  @ApiPropertyOptional({ description: "Expected cash amount from counter" })
  @Expose()
  expectedCashAmount?: number;

  @ApiPropertyOptional({ description: "Expected coin amount from counter" })
  @Expose()
  expectedCoinAmount?: number;

  @ApiPropertyOptional({ description: "Expected total amount" })
  @Expose()
  expectedTotalAmount?: number;

  @ApiPropertyOptional({
    description: "Difference between expected and actual",
  })
  @Expose()
  difference?: number;

  @ApiPropertyOptional({ description: "Difference percentage" })
  @Expose()
  differencePercent?: number;

  @ApiPropertyOptional({ description: "Machine counter before collection" })
  @Expose()
  counterBefore?: number;

  @ApiPropertyOptional({ description: "Machine counter after collection" })
  @Expose()
  counterAfter?: number;

  @ApiPropertyOptional({ description: "Sales count at collection" })
  @Expose()
  salesCount?: number;

  @ApiProperty({ description: "Collection is verified" })
  @Expose()
  isVerified: boolean;

  @ApiPropertyOptional({ description: "User ID who verified" })
  @Expose()
  verifiedByUserId?: string;

  @ApiPropertyOptional({ description: "Verification timestamp" })
  @Expose()
  verifiedAt?: Date;

  @ApiPropertyOptional({ description: "Photo URL" })
  @Expose()
  photoUrl?: string;

  @ApiProperty({ description: "Multiple photo URLs" })
  @Expose()
  photoUrls: string[];

  @ApiPropertyOptional({ description: "Notes" })
  @Expose()
  notes?: string;

  @ApiPropertyOptional({ description: "Latitude (GPS)" })
  @Expose()
  latitude?: number;

  @ApiPropertyOptional({ description: "Longitude (GPS)" })
  @Expose()
  longitude?: number;

  @ApiProperty({ description: "Collection timestamp" })
  @Expose()
  collectedAt: Date;

  @ApiProperty({
    description: "Metadata",
    type: "object",
    additionalProperties: true,
  })
  @Expose()
  metadata: Record<string, unknown>;

  @ApiProperty({ description: "Has discrepancy (computed)" })
  @Expose()
  get hasDiscrepancy(): boolean {
    if (this.difference === null || this.difference === undefined) return false;
    return Math.abs(this.difference) > 0;
  }

  @ApiProperty({ description: "Is significant discrepancy (computed)" })
  @Expose()
  get isSignificantDiscrepancy(): boolean {
    if (!this.differencePercent) return false;
    return Math.abs(this.differencePercent) > 5;
  }

  @Exclude()
  machine?: Record<string, unknown>;
}

/**
 * Transaction Daily Summary Response DTO
 */
@Expose()
export class TransactionDailySummaryResponseDto extends BaseResponseDto {
  @ApiProperty({ description: "Organization ID" })
  @Expose()
  organizationId: string;

  @ApiPropertyOptional({
    description: "Machine ID (null = organization total)",
  })
  @Expose()
  machineId?: string;

  @ApiProperty({ description: "Summary date" })
  @Expose()
  summaryDate: Date;

  @ApiProperty({ description: "Sales transaction count" })
  @Expose()
  salesCount: number;

  @ApiProperty({ description: "Total sales amount (UZS)" })
  @Expose()
  salesAmount: number;

  @ApiProperty({ description: "Sales VAT amount (UZS)" })
  @Expose()
  salesVatAmount: number;

  @ApiProperty({ description: "Cash payment amount (UZS)" })
  @Expose()
  cashAmount: number;

  @ApiProperty({ description: "Card payment amount (UZS)" })
  @Expose()
  cardAmount: number;

  @ApiProperty({ description: "Mobile payment amount (UZS)" })
  @Expose()
  mobileAmount: number;

  @ApiProperty({ description: "Refund count" })
  @Expose()
  refundsCount: number;

  @ApiProperty({ description: "Total refunds amount (UZS)" })
  @Expose()
  refundsAmount: number;

  @ApiProperty({ description: "Collection count" })
  @Expose()
  collectionsCount: number;

  @ApiProperty({ description: "Collections amount (UZS)" })
  @Expose()
  collectionsAmount: number;

  @ApiProperty({ description: "Expenses amount (UZS)" })
  @Expose()
  expensesAmount: number;

  @ApiProperty({ description: "Net amount (UZS)" })
  @Expose()
  netAmount: number;

  @ApiProperty({
    description: "Top selling products",
    type: "object",
    isArray: true,
    additionalProperties: true,
  })
  @Expose()
  topProducts: Array<{
    productId: string;
    productName: string;
    quantity: number;
    amount: number;
  }>;

  @ApiProperty({
    description: "Hourly sales statistics",
    type: "object",
    isArray: true,
    additionalProperties: true,
  })
  @Expose()
  hourlyStats: Array<{
    hour: number;
    count: number;
    amount: number;
  }>;

  @ApiPropertyOptional({ description: "Summary calculation timestamp" })
  @Expose()
  calculatedAt?: Date;
}

/**
 * Commission Response DTO
 */
@Expose()
export class CommissionResponseDto extends BaseResponseDto {
  @ApiProperty({ description: "Organization ID" })
  @Expose()
  organizationId: string;

  @ApiProperty({ description: "Contract ID" })
  @Expose()
  contractId: string;

  @ApiPropertyOptional({ description: "Location ID" })
  @Expose()
  locationId?: string;

  @ApiPropertyOptional({ description: "Machine ID" })
  @Expose()
  machineId?: string;

  @ApiProperty({ description: "Period start date" })
  @Expose()
  periodStart: Date;

  @ApiProperty({ description: "Period end date" })
  @Expose()
  periodEnd: Date;

  @ApiProperty({ description: "Base amount (total revenue for period)" })
  @Expose()
  baseAmount: number;

  @ApiPropertyOptional({ description: "Commission rate (%)" })
  @Expose()
  commissionRate?: number;

  @ApiPropertyOptional({ description: "Fixed commission amount (UZS)" })
  @Expose()
  fixedAmount?: number;

  @ApiProperty({ description: "Calculated commission amount (UZS)" })
  @Expose()
  commissionAmount: number;

  @ApiProperty({ description: "VAT amount (UZS)" })
  @Expose()
  vatAmount: number;

  @ApiProperty({ description: "Total commission with VAT (UZS)" })
  @Expose()
  totalAmount: number;

  @ApiProperty({ description: "Currency" })
  @Expose()
  currency: string;

  @ApiProperty({
    description: "Commission status",
    enum: CommissionStatus,
  })
  @Expose()
  status: CommissionStatus;

  @ApiProperty({ description: "Commission type" })
  @Expose()
  commissionType: string;

  @ApiPropertyOptional({ description: "Payment timestamp" })
  @Expose()
  paidAt?: Date;

  @ApiPropertyOptional({ description: "Payment transaction ID" })
  @Expose()
  paymentTransactionId?: string;

  @ApiPropertyOptional({ description: "Payment reference" })
  @Expose()
  paymentReference?: string;

  @ApiProperty({
    description: "Calculation details",
    type: "object",
    additionalProperties: true,
  })
  @Expose()
  calculationDetails: {
    transactionCount: number;
    averageTransaction: number;
    tierBreakdown?: Array<{
      tier: number;
      amount: number;
      rate: number;
      commission: number;
    }>;
    deductions?: Array<{
      reason: string;
      amount: number;
    }>;
  };

  @ApiPropertyOptional({ description: "Notes" })
  @Expose()
  notes?: string;

  @ApiPropertyOptional({ description: "User ID who calculated" })
  @Expose()
  calculatedByUserId?: string;

  @ApiPropertyOptional({ description: "Calculation timestamp" })
  @Expose()
  calculatedAt?: Date;
}
