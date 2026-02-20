/**
 * Push Subscription Entity for VendHub OS
 * Web Push API subscription for browser push notifications
 */

import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

@Entity("push_subscriptions")
@Index(["userId"])
@Index(["endpoint"], { unique: true })
export class PushSubscription extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "uuid" })
  userId: string;

  @Column({ type: "text", unique: true })
  endpoint: string;

  @Column({ type: "text" })
  p256dh: string;

  @Column({ type: "text" })
  auth: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  userAgent: string | null;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @Column({ type: "timestamp with time zone", nullable: true })
  lastUsedAt: Date | null;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null;
}
