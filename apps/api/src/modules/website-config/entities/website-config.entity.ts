/**
 * Website Config Entity
 *
 * Stores website configuration settings organized by section.
 * Multi-tenant with organizationId.
 * Tracks which user updated each config.
 */

import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

export enum WebsiteConfigSection {
  GENERAL = "general",
  SEO = "seo",
  SOCIAL = "social",
  THEME = "theme",
  ANALYTICS = "analytics",
}

@Entity("website_configs")
@Index(["organizationId", "section"])
@Index(["organizationId", "key"], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class WebsiteConfig extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "varchar", length: 255 })
  key: string;

  @Column({ type: "text" })
  value: string;

  @Column({
    type: "varchar",
    length: 50,
    default: WebsiteConfigSection.GENERAL,
  })
  section: WebsiteConfigSection;

  @Column({ type: "uuid", nullable: true })
  updatedBy: string | null;
}
