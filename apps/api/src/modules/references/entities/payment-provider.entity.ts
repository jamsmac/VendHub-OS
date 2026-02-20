import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

/**
 * Payment provider type classification.
 */
export enum PaymentProviderType {
  CARD = "card",
  QR = "qr",
  NFC = "nfc",
  CASH = "cash",
  TELEGRAM = "telegram",
  BANK_TRANSFER = "bank_transfer",
}

/**
 * PaymentProvider Entity
 * Payment providers available in Uzbekistan for vending machine payments.
 * Includes Payme, Click, Uzum Bank, Telegram Stars, and cash.
 */
@Entity("payment_providers")
@Index("IDX_payment_providers_code", ["code"], { unique: true })
@Index("IDX_payment_providers_is_active", ["isActive"])
@Index("IDX_payment_providers_type", ["type"])
export class PaymentProvider extends BaseEntity {
  @Column({ type: "varchar", length: 50, unique: true })
  code: string; // 'payme', 'click', 'uzum', 'cash', 'telegram_stars'

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  nameRu: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  nameUz: string | null;

  @Column({ type: "enum", enum: PaymentProviderType })
  type: PaymentProviderType;

  @Column({ type: "text", nullable: true })
  logoUrl: string | null;

  @Column({ type: "text", nullable: true })
  websiteUrl: string | null;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @Column({ type: "boolean", default: false })
  isDefault: boolean;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  commissionRate: number; // provider commission %

  @Column({ type: "jsonb", nullable: true })
  settings: Record<string, unknown> | null; // provider-specific settings schema

  @Column({ type: "jsonb", nullable: true })
  supportedCurrencies: string[] | null; // ['UZS']

  @Column({ type: "int", default: 0 })
  sortOrder: number;
}
