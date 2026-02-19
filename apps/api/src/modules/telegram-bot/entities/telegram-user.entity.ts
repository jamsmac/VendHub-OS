/**
 * Telegram User Entity
 * Tracks Telegram users linked to VendHub (both staff and customer bots)
 */

import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

// ============================================================================
// ENUMS
// ============================================================================

export enum TelegramUserStatus {
  ACTIVE = "active",
  BLOCKED = "blocked",
  INACTIVE = "inactive",
}

export enum TelegramLanguage {
  RU = "ru",
  EN = "en",
  UZ = "uz",
}

// ============================================================================
// ENTITY
// ============================================================================

@Entity("telegram_users")
@Index(["telegramId"], { unique: true })
@Index(["userId"])
@Index(["organizationId", "status"])
@Index(["chatId"])
export class TelegramUser extends BaseEntity {
  @Column({ type: "uuid", nullable: true })
  organizationId: string | null;

  @Column({ type: "varchar", length: 50, unique: true })
  telegramId: string;

  @Column({ type: "uuid", nullable: true })
  userId: string | null;

  @Column({ type: "varchar", length: 50 })
  chatId: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  username: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  firstName: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  lastName: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  phone: string | null;

  @Column({
    type: "enum",
    enum: TelegramLanguage,
    default: TelegramLanguage.RU,
  })
  language: TelegramLanguage;

  @Column({
    type: "enum",
    enum: TelegramUserStatus,
    default: TelegramUserStatus.ACTIVE,
  })
  status: TelegramUserStatus;

  @Column({ type: "varchar", length: 20 })
  botType: string;

  @Column({ type: "jsonb", nullable: true })
  notificationPreferences: Record<string, unknown> | null;

  @Column({ type: "boolean", default: false })
  isVerified: boolean;

  @Column({ type: "varchar", length: 10, nullable: true })
  verificationCode: string | null;

  @Column({ type: "timestamp with time zone", nullable: true })
  verificationExpiresAt: Date | null;

  @Column({ type: "timestamp with time zone", nullable: true })
  lastInteractionAt: Date | null;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null;
}
