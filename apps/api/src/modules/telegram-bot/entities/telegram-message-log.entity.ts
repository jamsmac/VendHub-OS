/**
 * Telegram Message Log Entity
 * Logs all incoming/outgoing messages for audit and analytics
 */

import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { TelegramUser } from './telegram-user.entity';

// ============================================================================
// ENUMS
// ============================================================================

export enum TelegramMessageType {
  COMMAND = 'command',
  NOTIFICATION = 'notification',
  CALLBACK = 'callback',
  MESSAGE = 'message',
  PHOTO = 'photo',
  LOCATION = 'location',
  CONTACT = 'contact',
  ERROR = 'error',
}

export enum TelegramMessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  READ = 'read',
}

// ============================================================================
// ENTITY
// ============================================================================

@Entity('telegram_message_logs')
@Index(['telegram_user_id'])
@Index(['chat_id', 'created_at'])
@Index(['message_type', 'status'])
@Index(['organization_id', 'created_at'])
export class TelegramMessageLog extends BaseEntity {
  @Column({ type: 'uuid', nullable: true })
  organization_id: string | null;

  @Column({ type: 'uuid' })
  telegram_user_id: string;

  @ManyToOne(() => TelegramUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'telegram_user_id' })
  telegram_user: TelegramUser;

  @Column({ type: 'varchar', length: 50 })
  chat_id: string;

  @Column({ type: 'varchar', length: 10 })
  direction: string;

  @Column({
    type: 'enum',
    enum: TelegramMessageType,
  })
  message_type: TelegramMessageType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  command: string | null;

  @Column({ type: 'text', nullable: true })
  message_text: string | null;

  @Column({ type: 'integer', nullable: true })
  telegram_message_id: number | null;

  @Column({
    type: 'enum',
    enum: TelegramMessageStatus,
    default: TelegramMessageStatus.SENT,
  })
  status: TelegramMessageStatus;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  @Column({ type: 'integer', nullable: true })
  response_time_ms: number | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
