/**
 * Telegram Settings Entity
 * Stores configuration for staff and customer bots
 */

import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { TelegramLanguage } from './telegram-user.entity';

// ============================================================================
// ENTITY
// ============================================================================

@Entity('telegram_settings')
@Index(['setting_key'], { unique: true })
export class TelegramSettings extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  setting_key: string;

  @Column({ type: 'text', nullable: true })
  bot_token_encrypted: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  bot_username: string | null;

  @Column({ type: 'varchar', length: 20, default: 'polling' })
  mode: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  webhook_url: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'boolean', default: true })
  send_notifications: boolean;

  @Column({ type: 'integer', default: 30 })
  max_messages_per_minute: number;

  @Column({
    type: 'enum',
    enum: TelegramLanguage,
    default: TelegramLanguage.RU,
  })
  default_language: TelegramLanguage;

  @Column({ type: 'text', nullable: true })
  welcome_message_ru: string | null;

  @Column({ type: 'text', nullable: true })
  welcome_message_uz: string | null;

  @Column({ type: 'text', nullable: true })
  welcome_message_en: string | null;

  @Column({ type: 'jsonb', nullable: true })
  default_notification_preferences: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
