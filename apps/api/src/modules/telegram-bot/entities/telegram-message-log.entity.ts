/**
 * Telegram Message Log Entity
 * Logs all incoming/outgoing messages for audit and analytics
 */

import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { TelegramUser } from "./telegram-user.entity";

// ============================================================================
// ENUMS
// ============================================================================

export enum TelegramMessageType {
  COMMAND = "command",
  NOTIFICATION = "notification",
  CALLBACK = "callback",
  MESSAGE = "message",
  PHOTO = "photo",
  LOCATION = "location",
  CONTACT = "contact",
  ERROR = "error",
}

export enum TelegramMessageStatus {
  SENT = "sent",
  DELIVERED = "delivered",
  FAILED = "failed",
  READ = "read",
}

// ============================================================================
// ENTITY
// ============================================================================

@Entity("telegram_message_logs")
@Index(["telegramUserId"])
@Index(["chatId", "createdAt"])
@Index(["messageType", "status"])
@Index(["organizationId", "createdAt"])
export class TelegramMessageLog extends BaseEntity {
  @Column({ type: "uuid", nullable: true })
  organizationId: string | null;

  @Column({ type: "uuid" })
  telegramUserId: string;

  @ManyToOne(() => TelegramUser, { onDelete: "SET NULL" })
  @JoinColumn({ name: "telegram_user_id" })
  telegramUser: TelegramUser;

  @Column({ type: "varchar", length: 50 })
  chatId: string;

  @Column({ type: "varchar", length: 10 })
  direction: string;

  @Column({
    type: "enum",
    enum: TelegramMessageType,
  })
  messageType: TelegramMessageType;

  @Column({ type: "varchar", length: 100, nullable: true })
  command: string | null;

  @Column({ type: "text", nullable: true })
  messageText: string | null;

  @Column({ type: "integer", nullable: true })
  telegramMessageId: number | null;

  @Column({
    type: "enum",
    enum: TelegramMessageStatus,
    default: TelegramMessageStatus.SENT,
  })
  status: TelegramMessageStatus;

  @Column({ type: "text", nullable: true })
  errorMessage: string | null;

  @Column({ type: "integer", nullable: true })
  responseTimeMs: number | null;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null;
}
