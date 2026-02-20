import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Column,
} from "typeorm";

/**
 * Base entity class that all entities should extend.
 *
 * Provides:
 * - UUID primary key
 * - Automatic timestamps (createdAt, updatedAt)
 * - Soft delete support (deletedAt)
 * - Audit fields (createdById, updatedById)
 *
 * Note: SnakeNamingStrategy auto-converts camelCase properties
 * to snake_case DB columns (e.g. createdAt → created_at).
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updatedAt: Date;

  @DeleteDateColumn({ type: "timestamp with time zone", nullable: true })
  deletedAt: Date | null;

  /**
   * ID of the user who created this record.
   * Used for audit trails.
   */
  @Column({ type: "uuid", nullable: true })
  createdById: string | null = null;

  /**
   * ID of the user who last updated this record.
   * Used for audit trails.
   */
  @Column({ type: "uuid", nullable: true })
  updatedById: string | null = null;
}
