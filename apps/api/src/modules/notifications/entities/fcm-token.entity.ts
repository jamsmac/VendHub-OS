/**
 * FCM Token Entity for VendHub OS
 * Firebase Cloud Messaging tokens for mobile and web push notifications
 */

import {
  Entity,
  Column,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Device type for FCM token
 */
export enum DeviceType {
  IOS = 'ios',
  ANDROID = 'android',
  WEB = 'web',
}

@Entity('fcm_tokens')
@Index(['user_id'])
@Index(['token'], { unique: true })
export class FcmToken extends BaseEntity {
  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'text', unique: true })
  token: string;

  @Column({
    type: 'enum',
    enum: DeviceType,
  })
  device_type: DeviceType;

  @Column({ type: 'varchar', length: 200, nullable: true })
  device_name: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  device_id: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_used_at: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
