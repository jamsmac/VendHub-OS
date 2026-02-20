/**
 * FCM Token Entity for VendHub OS
 * Firebase Cloud Messaging tokens for mobile and web push notifications
 */

import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

/**
 * Device type for FCM token
 */
export enum DeviceType {
  IOS = "ios",
  ANDROID = "android",
  WEB = "web",
}

@Entity("fcm_tokens")
@Index(["userId"])
@Index(["token"], { unique: true })
export class FcmToken extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "uuid" })
  userId: string;

  @Column({ type: "text", unique: true })
  token: string;

  @Column({
    type: "enum",
    enum: DeviceType,
  })
  deviceType: DeviceType;

  @Column({ type: "varchar", length: 200, nullable: true })
  deviceName: string | null;

  @Column({ type: "varchar", length: 200, nullable: true })
  deviceId: string | null;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @Column({ type: "timestamp with time zone", nullable: true })
  lastUsedAt: Date | null;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null;
}
