/**
 * Telegram Bot Analytics Entity
 * Tracks bot usage events for analytics and monitoring
 */

import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { TelegramUser } from './telegram-user.entity';

// ============================================================================
// ENUMS
// ============================================================================

export enum TelegramEventType {
  COMMAND = 'command',
  CALLBACK = 'callback',
  MESSAGE = 'message',
  QUICK_ACTION = 'quick_action',
  VOICE_COMMAND = 'voice_command',
  QR_SCAN = 'qr_scan',
  LOCATION_SHARE = 'location_share',
  BOT_START = 'bot_start',
  BOT_BLOCK = 'bot_block',
  NOTIFICATION_SENT = 'notification_sent',
  NOTIFICATION_FAILED = 'notification_failed',
}

// ============================================================================
// ENTITY
// ============================================================================

@Entity('telegram_bot_analytics')
@Index(['telegram_user_id', 'created_at'])
@Index(['event_type', 'created_at'])
@Index(['organization_id', 'created_at'])
@Index(['action_name'])
export class TelegramBotAnalytics extends BaseEntity {
  @Column({ type: 'uuid', nullable: true })
  organization_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  telegram_user_id: string | null;

  @ManyToOne(() => TelegramUser, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'telegram_user_id' })
  telegram_user: TelegramUser | null;

  @Column({ type: 'uuid', nullable: true })
  user_id: string | null;

  @Column({ type: 'varchar', length: 20 })
  bot_type: string;

  @Column({
    type: 'enum',
    enum: TelegramEventType,
  })
  event_type: TelegramEventType;

  @Column({ type: 'varchar', length: 100 })
  action_name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  action_category: string | null;

  @Column({ type: 'integer', nullable: true })
  response_time_ms: number | null;

  @Column({ type: 'boolean', default: true })
  success: boolean;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  session_id: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
