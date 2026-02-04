/**
 * SystemSetting Entity
 *
 * Stores system-wide and per-organization configuration settings.
 * Supports encrypted values for sensitive data (API keys, passwords).
 * Public settings can be accessed without authentication.
 */

import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum SettingCategory {
  GENERAL = 'general',
  SMTP = 'smtp',
  SMS = 'sms',
  PAYMENT = 'payment',
  FISCAL = 'fiscal',
  NOTIFICATION = 'notification',
  SECURITY = 'security',
  AI = 'ai',
  INTEGRATION = 'integration',
  APPEARANCE = 'appearance',
}

@Entity('system_settings')
@Index(['key'], { unique: true, where: '"deleted_at" IS NULL' })
@Index(['category'])
@Index(['organizationId'])
export class SystemSetting extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  key: string;

  @Column({ type: 'jsonb', nullable: true })
  value: any;

  @Column({ type: 'varchar', length: 50, default: SettingCategory.GENERAL })
  category: SettingCategory;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', default: false })
  isEncrypted: boolean;

  @Column({ type: 'boolean', default: false })
  isPublic: boolean;

  @Column({ type: 'uuid', nullable: true })
  organizationId: string;
}
