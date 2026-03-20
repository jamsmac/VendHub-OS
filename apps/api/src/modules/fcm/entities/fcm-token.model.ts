/**
 * FCM Token Entity
 * Stores Firebase Cloud Messaging device tokens for mobile push notifications
 */

import { Column, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

export enum DeviceType {
  ANDROID = "android",
  IOS = "ios",
  WEB = "web",
}

// DUPLICATE: @Entity("fcm_tokens")
@Index(["userId"])
@Index(["token"], { unique: true })
export class FcmToken extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "uuid" })
  userId: string;

  @Column({ type: "varchar", length: 500 })
  token: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  deviceType: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  deviceName: string | null;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @Column({ type: "timestamp with time zone", nullable: true })
  lastUsedAt: Date | null;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null;
}
