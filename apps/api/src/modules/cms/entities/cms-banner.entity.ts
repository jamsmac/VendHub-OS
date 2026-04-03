/**
 * CMS Banner Entity
 *
 * Stores promotional banners for the public website.
 * Supports scheduling (validFrom/validUntil), i18n (ru/uz), and targeting.
 * Multi-tenant with organizationId.
 */

import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

export enum BannerPosition {
  HERO = "hero",
  TOP = "top",
  SIDEBAR = "sidebar",
  POPUP = "popup",
  INLINE = "inline",
}

export enum BannerStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  SCHEDULED = "scheduled",
  EXPIRED = "expired",
  ARCHIVED = "archived",
}

@Entity("cms_banners")
@Index(["organizationId", "status"])
@Index(["organizationId", "position"])
@Index(["organizationId", "sortOrder"])
export class CmsBanner extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  // Content (Russian)
  @Column({ type: "varchar", length: 255 })
  titleRu: string;

  @Column({ type: "text", nullable: true })
  descriptionRu: string | null;

  // Content (Uzbek)
  @Column({ type: "varchar", length: 255, nullable: true })
  titleUz: string | null;

  @Column({ type: "text", nullable: true })
  descriptionUz: string | null;

  // Media
  @Column({ type: "text", nullable: true })
  imageUrl: string | null;

  @Column({ type: "text", nullable: true })
  imageUrlMobile: string | null;

  // Action
  @Column({ type: "varchar", length: 500, nullable: true })
  linkUrl: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  buttonTextRu: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  buttonTextUz: string | null;

  // Display
  @Column({
    type: "enum",
    enum: BannerPosition,
    default: BannerPosition.HERO,
  })
  position: BannerPosition;

  @Column({
    type: "enum",
    enum: BannerStatus,
    default: BannerStatus.DRAFT,
  })
  status: BannerStatus;

  @Column({ type: "int", default: 0 })
  sortOrder: number;

  // Scheduling
  @Column({ type: "timestamp with time zone", nullable: true })
  validFrom: Date | null;

  @Column({ type: "timestamp with time zone", nullable: true })
  validUntil: Date | null;

  // Styling
  @Column({ type: "varchar", length: 7, nullable: true })
  backgroundColor: string | null; // hex color e.g. #FF5733

  @Column({ type: "varchar", length: 7, nullable: true })
  textColor: string | null;

  // Tracking
  @Column({ type: "int", default: 0 })
  impressions: number;

  @Column({ type: "int", default: 0 })
  clicks: number;

  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;
}
