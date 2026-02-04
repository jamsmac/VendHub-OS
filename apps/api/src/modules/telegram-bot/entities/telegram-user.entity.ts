/**
 * Telegram User Entity
 * Tracks Telegram users linked to VendHub (both staff and customer bots)
 */

import { Entity, Column, Index, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

// ============================================================================
// ENUMS
// ============================================================================

export enum TelegramUserStatus {
  ACTIVE = 'active',
  BLOCKED = 'blocked',
  INACTIVE = 'inactive',
}

export enum TelegramLanguage {
  RU = 'ru',
  EN = 'en',
  UZ = 'uz',
}

// ============================================================================
// ENTITY
// ============================================================================

@Entity('telegram_users')
@Index(['telegram_id'], { unique: true })
@Index(['user_id'])
@Index(['organization_id', 'status'])
@Index(['chat_id'])
export class TelegramUser extends BaseEntity {
  @Column({ type: 'uuid', nullable: true })
  organization_id: string | null;

  @Column({ type: 'varchar', length: 50, unique: true })
  telegram_id: string;

  @Column({ type: 'uuid', nullable: true })
  user_id: string | null;

  @Column({ type: 'varchar', length: 50 })
  chat_id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  username: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  first_name: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  last_name: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({
    type: 'enum',
    enum: TelegramLanguage,
    default: TelegramLanguage.RU,
  })
  language: TelegramLanguage;

  @Column({
    type: 'enum',
    enum: TelegramUserStatus,
    default: TelegramUserStatus.ACTIVE,
  })
  status: TelegramUserStatus;

  @Column({ type: 'varchar', length: 20 })
  bot_type: string;

  @Column({ type: 'jsonb', nullable: true })
  notification_preferences: Record<string, any> | null;

  @Column({ type: 'boolean', default: false })
  is_verified: boolean;

  @Column({ type: 'varchar', length: 10, nullable: true })
  verification_code: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  verification_expires_at: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_interaction_at: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
