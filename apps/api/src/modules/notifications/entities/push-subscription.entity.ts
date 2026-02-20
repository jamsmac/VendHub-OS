/**
 * Push Subscription Entity for VendHub OS
 * Web Push API subscription for browser push notifications
 */

import {
  Entity,
  Column,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('push_subscriptions')
@Index(['user_id'])
@Index(['endpoint'], { unique: true })
export class PushSubscription extends BaseEntity {
  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'text', unique: true })
  endpoint: string;

  @Column({ type: 'text' })
  p256dh: string;

  @Column({ type: 'text' })
  auth: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  user_agent: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_used_at: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
