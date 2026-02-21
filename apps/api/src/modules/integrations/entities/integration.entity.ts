import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Organization } from "../../organizations/entities/organization.entity";
import {
  IntegrationCategory,
  IntegrationStatus,
  PaymentIntegrationConfig,
} from "../types/integration.types";

@Entity("integrations")
@Index(["organizationId", "category"])
@Index(["organizationId", "status"])
export class Integration extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: "SET NULL" })
  @JoinColumn({ name: "organization_id" })
  organization: Organization;

  @Column({ type: "varchar", length: 100 })
  name: string;

  @Column({ type: "varchar", length: 200 })
  displayName: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({
    type: "enum",
    enum: IntegrationCategory,
    default: IntegrationCategory.PAYMENT,
  })
  category: IntegrationCategory;

  @Column({
    type: "enum",
    enum: IntegrationStatus,
    default: IntegrationStatus.DRAFT,
  })
  status: IntegrationStatus;

  @Column({ type: "varchar", length: 500, nullable: true })
  logo: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  website: string;

  @Column({ type: "varchar", length: 1000, nullable: true })
  documentationUrl: string;

  @Column({ type: "jsonb" })
  config: PaymentIntegrationConfig;

  @Column({ type: "jsonb", nullable: true })
  credentials: Record<string, string>;

  @Column({ type: "jsonb", nullable: true })
  sandboxCredentials: Record<string, string>;

  @Column({ type: "boolean", default: true })
  sandboxMode: boolean;

  @Column({ type: "boolean", default: false })
  isTemplate: boolean;

  @Column({ type: "varchar", length: 100, nullable: true })
  templateId: string;

  @Column({ type: "int", default: 0 })
  priority: number;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown>;

  @Column({ type: "jsonb", nullable: true })
  aiConfigSession: Record<string, unknown>;

  @Column({ type: "text", nullable: true })
  lastError: string;

  @Column({ type: "timestamp", nullable: true })
  lastTestedAt: Date;

  @Column({ type: "timestamp", nullable: true })
  lastUsedAt: Date;

  @Column({ type: "int", default: 0 })
  successCount: number;

  @Column({ type: "int", default: 0 })
  errorCount: number;
}

@Entity("integration_templates")
@Index(["category"])
@Index(["isActive"])
export class IntegrationTemplate extends BaseEntity {
  @Column({ type: "varchar", length: 100, unique: true })
  name: string;

  @Column({ type: "varchar", length: 200 })
  displayName: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({
    type: "enum",
    enum: IntegrationCategory,
  })
  category: IntegrationCategory;

  @Column({ type: "varchar", length: 500, nullable: true })
  logo: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  website: string;

  @Column({ type: "varchar", length: 1000, nullable: true })
  documentationUrl: string;

  @Column({ type: "jsonb" })
  defaultConfig: PaymentIntegrationConfig;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @Column({ type: "varchar", length: 10, default: "UZ" })
  country: string;

  @Column({ type: "simple-array", nullable: true })
  tags: string[];

  @Column({ type: "int", default: 0 })
  usageCount: number;

  @Column({ type: "decimal", precision: 3, scale: 2, default: 0 })
  rating: number;
}

@Entity("integration_logs")
@Index(["integrationId", "createdAt"])
@Index(["organizationId", "createdAt"])
export class IntegrationLog extends BaseEntity {
  @Column({ type: "uuid" })
  integrationId: string;

  @ManyToOne(() => Integration, { onDelete: "SET NULL" })
  @JoinColumn({ name: "integration_id" })
  integration: Integration;

  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "varchar", length: 50 })
  action: string;

  @Column({ type: "varchar", length: 10 })
  method: string;

  @Column({ type: "varchar", length: 500 })
  endpoint: string;

  @Column({ type: "jsonb", nullable: true })
  requestHeaders: Record<string, string>;

  @Column({ type: "jsonb", nullable: true })
  requestBody: Record<string, unknown>;

  @Column({ type: "int", nullable: true })
  responseStatus: number;

  @Column({ type: "jsonb", nullable: true })
  responseHeaders: Record<string, string>;

  @Column({ type: "jsonb", nullable: true })
  responseBody: Record<string, unknown>;

  @Column({ type: "int", nullable: true })
  duration: number;

  @Column({ type: "boolean", default: true })
  success: boolean;

  @Column({ type: "text", nullable: true })
  error: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  referenceId: string;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown>;
}

@Entity("integration_webhooks")
@Index(["integrationId"])
@Index(["organizationId", "createdAt"])
export class IntegrationWebhook extends BaseEntity {
  @Column({ type: "uuid" })
  integrationId: string;

  @ManyToOne(() => Integration, { onDelete: "SET NULL" })
  @JoinColumn({ name: "integration_id" })
  integration: Integration;

  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "varchar", length: 100 })
  event: string;

  @Column({ type: "jsonb" })
  payload: Record<string, unknown>;

  @Column({ type: "jsonb", nullable: true })
  headers: Record<string, string>;

  @Column({ type: "boolean", default: false })
  processed: boolean;

  @Column({ type: "boolean", default: false })
  verified: boolean;

  @Column({ type: "text", nullable: true })
  processingError: string;

  @Column({ type: "int", default: 0 })
  retryCount: number;

  @Column({ type: "timestamp", nullable: true })
  processedAt: Date;
}

// ============================================================================
// SYNC JOB ENTITY
// ============================================================================

export enum SyncJobStatus {
  SCHEDULED = "scheduled",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export enum SyncDirection {
  INBOUND = "inbound",
  OUTBOUND = "outbound",
  BIDIRECTIONAL = "bidirectional",
}

@Entity("sync_jobs")
@Index(["integrationId"])
@Index(["status"])
@Index(["scheduledAt"])
export class SyncJob extends BaseEntity {
  @Column({ type: "uuid" })
  integrationId: string;

  @ManyToOne(() => Integration, { onDelete: "CASCADE" })
  @JoinColumn({ name: "integration_id" })
  integration: Integration;

  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "varchar", length: 100 })
  jobName: string;

  @Column({ type: "enum", enum: SyncDirection })
  direction: SyncDirection;

  @Column({ type: "varchar", length: 100 })
  entityType: string; // products, orders, customers, etc.

  @Column({
    type: "enum",
    enum: SyncJobStatus,
    default: SyncJobStatus.SCHEDULED,
  })
  status: SyncJobStatus;

  @Column({ type: "timestamp" })
  scheduledAt: Date;

  @Column({ type: "timestamp", nullable: true })
  startedAt: Date | null;

  @Column({ type: "timestamp", nullable: true })
  completedAt: Date | null;

  @Column({ type: "int", nullable: true })
  durationMs: number | null;

  @Column({ type: "int", default: 0 })
  totalRecords: number;

  @Column({ type: "int", default: 0 })
  processedRecords: number;

  @Column({ type: "int", default: 0 })
  successfulRecords: number;

  @Column({ type: "int", default: 0 })
  failedRecords: number;

  @Column({ type: "text", nullable: true })
  errorMessage: string | null;

  @Column({ type: "jsonb", default: {} })
  config: {
    filters?: Record<string, unknown>;
    mapping?: Record<string, unknown>;
    batchSize?: number;
    [key: string]: unknown;
  };

  @Column({ type: "jsonb", default: {} })
  results: {
    errors?: Array<{ recordId?: string; error?: string }>;
    warnings?: string[];
    summary?: Record<string, unknown>;
    [key: string]: unknown;
  };

  @Column({ type: "uuid", nullable: true })
  triggeredById: string | null;
}

// ============================================================================
// API KEY ENTITY
// ============================================================================

export enum ApiKeyStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  REVOKED = "revoked",
  EXPIRED = "expired",
}

@Entity("api_keys")
@Index(["organizationId"])
@Index(["status"])
@Unique(["keyHash"])
@Unique(["keyPrefix"])
export class ApiKey extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "varchar", length: 100 })
  name: string;

  @Column({ type: "varchar", length: 64 })
  keyHash: string;

  @Column({ type: "varchar", length: 16 })
  keyPrefix: string; // First 8 chars for identification

  @Column({ type: "uuid" })
  userId: string;

  @Column({
    type: "enum",
    enum: ApiKeyStatus,
    default: ApiKeyStatus.ACTIVE,
  })
  status: ApiKeyStatus;

  @Column({ type: "timestamp", nullable: true })
  expiresAt: Date | null;

  @Column({ type: "timestamp", nullable: true })
  lastUsedAt: Date | null;

  @Column({ type: "int", default: 0 })
  usageCount: number;

  @Column({ type: "int", nullable: true })
  rateLimit: number | null; // Requests per minute

  @Column({ type: "jsonb", default: [] })
  scopes: string[]; // ['read:products', 'write:orders', etc.]

  @Column({ type: "jsonb", default: {} })
  metadata: {
    ipWhitelist?: string[];
    allowedOrigins?: string[];
    description?: string;
    [key: string]: unknown;
  };
}
