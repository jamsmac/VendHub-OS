/**
 * DeviceToken Entity for VendHub OS
 * Stores Expo push notification tokens for mobile devices
 */

import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

export enum DeviceType {
  IOS = "ios",
  ANDROID = "android",
  WEB = "web",
}

@Entity("device_tokens")
@Index(["organizationId", "userId"])
@Index(["token"], { unique: true })
export class DeviceToken extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "uuid" })
  userId: string;

  @Column({ type: "varchar", length: 255 })
  token: string;

  @Column({ type: "enum", enum: DeviceType })
  deviceType: DeviceType;

  @Column({ type: "varchar", length: 100, nullable: true })
  platformVersion: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  appVersion: string | null;

  @Column({ type: "timestamp with time zone", nullable: true })
  lastUsedAt: Date | null;
}
