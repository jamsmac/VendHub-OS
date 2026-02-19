/**
 * Telegram Settings Entity
 * Stores configuration for staff and customer bots
 */

import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { TelegramLanguage } from "./telegram-user.entity";

// ============================================================================
// ENTITY
// ============================================================================

@Entity("telegram_settings")
@Index(["settingKey"], { unique: true })
export class TelegramSettings extends BaseEntity {
  @Column({ type: "varchar", length: 50, unique: true })
  settingKey: string;

  @Column({ type: "text", nullable: true })
  botTokenEncrypted: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  botUsername: string | null;

  @Column({ type: "varchar", length: 20, default: "polling" })
  mode: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  webhookUrl: string | null;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @Column({ type: "boolean", default: true })
  sendNotifications: boolean;

  @Column({ type: "integer", default: 30 })
  maxMessagesPerMinute: number;

  @Column({
    type: "enum",
    enum: TelegramLanguage,
    default: TelegramLanguage.RU,
  })
  defaultLanguage: TelegramLanguage;

  @Column({ type: "text", nullable: true })
  welcomeMessageRu: string | null;

  @Column({ type: "text", nullable: true })
  welcomeMessageUz: string | null;

  @Column({ type: "text", nullable: true })
  welcomeMessageEn: string | null;

  @Column({ type: "jsonb", nullable: true })
  defaultNotificationPreferences: Record<string, unknown> | null;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null;
}
