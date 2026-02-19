/**
 * Telegram Bot Analytics Entity
 * Tracks bot usage events for analytics and monitoring
 */

import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { TelegramUser } from "./telegram-user.entity";

// ============================================================================
// ENUMS
// ============================================================================

export enum TelegramEventType {
  COMMAND = "command",
  CALLBACK = "callback",
  MESSAGE = "message",
  QUICK_ACTION = "quick_action",
  VOICE_COMMAND = "voice_command",
  QR_SCAN = "qr_scan",
  LOCATION_SHARE = "location_share",
  BOT_START = "bot_start",
  BOT_BLOCK = "bot_block",
  NOTIFICATION_SENT = "notification_sent",
  NOTIFICATION_FAILED = "notification_failed",
}

// ============================================================================
// ENTITY
// ============================================================================

@Entity("telegram_bot_analytics")
@Index(["telegramUserId", "createdAt"])
@Index(["eventType", "createdAt"])
@Index(["organizationId", "createdAt"])
@Index(["actionName"])
export class TelegramBotAnalytics extends BaseEntity {
  @Column({ type: "uuid", nullable: true })
  organizationId: string | null;

  @Column({ type: "uuid", nullable: true })
  telegramUserId: string | null;

  @ManyToOne(() => TelegramUser, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "telegram_user_id" })
  telegramUser: TelegramUser | null;

  @Column({ type: "uuid", nullable: true })
  userId: string | null;

  @Column({ type: "varchar", length: 20 })
  botType: string;

  @Column({
    type: "enum",
    enum: TelegramEventType,
  })
  eventType: TelegramEventType;

  @Column({ type: "varchar", length: 100 })
  actionName: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  actionCategory: string | null;

  @Column({ type: "integer", nullable: true })
  responseTimeMs: number | null;

  @Column({ type: "boolean", default: true })
  success: boolean;

  @Column({ type: "text", nullable: true })
  errorMessage: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  sessionId: string | null;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null;
}
