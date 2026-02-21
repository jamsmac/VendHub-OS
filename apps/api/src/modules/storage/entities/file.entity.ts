/**
 * File Entity
 * Tracks file metadata in DB — complements S3/MinIO storage operations
 */

import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

@Entity("files")
@Index(["organizationId"])
@Index(["entityType", "entityId"])
@Index(["categoryCode"])
@Index(["uploadedByUserId"])
export class FileRecord extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "varchar", length: 255 })
  originalFilename: string;

  @Column({ type: "varchar", length: 255 })
  storedFilename: string; // UUID + extension

  @Column({ type: "varchar", length: 255 })
  filePath: string;

  @Column({ type: "varchar", length: 100 })
  mimeType: string;

  @Column({ type: "bigint" })
  fileSize: number; // bytes

  @Column({ type: "varchar", length: 50 })
  categoryCode: string; // from dictionaries: file_categories

  // Polymorphic entity linkage
  @Column({ type: "varchar", length: 50 })
  entityType: string; // task, machine, location, incident, etc.

  @Column({ type: "varchar", length: 100 })
  entityId: string; // UUID of related entity

  @Column({ type: "uuid" })
  uploadedByUserId: string;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ type: "text", array: true, default: "{}" })
  tags: string[];

  // Image-specific metadata
  @Column({ type: "int", nullable: true })
  imageWidth: number | null;

  @Column({ type: "int", nullable: true })
  imageHeight: number | null;

  // URLs
  @Column({ type: "text", nullable: true })
  url: string | null;

  @Column({ type: "text", nullable: true })
  thumbnailUrl: string | null;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null;
}
