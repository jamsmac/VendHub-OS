/**
 * CMS Article Entity
 *
 * Stores articles and help content for the CMS.
 * Supports publishing workflow, tagging, and SEO metadata.
 * Multi-tenant with organizationId.
 */

import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

@Entity("cms_articles")
@Index(["organizationId", "slug"], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
@Index(["organizationId", "isPublished"])
@Index(["organizationId", "category"])
export class CmsArticle extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ type: "varchar", length: 255, unique: true })
  slug: string;

  @Column({ type: "text" })
  content: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  category: string | null;

  @Column({ type: "boolean", default: false })
  isPublished: boolean;

  @Column({ type: "timestamp with time zone", nullable: true })
  publishedAt: Date | null;

  @Column({ type: "uuid", nullable: true })
  authorId: string | null;

  @Column({ type: "int", default: 0 })
  sortOrder: number;

  @Column({ type: "simple-json", nullable: true })
  tags: string[] | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  metaTitle: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  metaDescription: string | null;
}
