import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import {
  IntegrationCategory,
  IntegrationStatus,
  PaymentIntegrationConfig,
} from '../types/integration.types';

@Entity('integrations')
@Index(['organizationId', 'category'])
@Index(['organizationId', 'status'])
export class Integration extends BaseEntity {
  @Column({ type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 200 })
  displayName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: IntegrationCategory,
    default: IntegrationCategory.PAYMENT,
  })
  category: IntegrationCategory;

  @Column({
    type: 'enum',
    enum: IntegrationStatus,
    default: IntegrationStatus.DRAFT,
  })
  status: IntegrationStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logo: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  website: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  documentationUrl: string;

  @Column({ type: 'jsonb' })
  config: PaymentIntegrationConfig;

  @Column({ type: 'jsonb', nullable: true })
  credentials: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  sandboxCredentials: Record<string, string>;

  @Column({ type: 'boolean', default: true })
  sandboxMode: boolean;

  @Column({ type: 'boolean', default: false })
  isTemplate: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  templateId: string;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  aiConfigSession: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  lastError: string;

  @Column({ type: 'timestamp', nullable: true })
  lastTestedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date;

  @Column({ type: 'int', default: 0 })
  successCount: number;

  @Column({ type: 'int', default: 0 })
  errorCount: number;
}

@Entity('integration_templates')
@Index(['category'])
@Index(['isActive'])
export class IntegrationTemplate extends BaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 200 })
  displayName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: IntegrationCategory,
  })
  category: IntegrationCategory;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logo: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  website: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  documentationUrl: string;

  @Column({ type: 'jsonb' })
  defaultConfig: PaymentIntegrationConfig;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 10, default: 'UZ' })
  country: string;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ type: 'int', default: 0 })
  usageCount: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;
}

@Entity('integration_logs')
@Index(['integrationId', 'created_at'])
@Index(['organizationId', 'created_at'])
export class IntegrationLog extends BaseEntity {
  @Column({ type: 'uuid' })
  integrationId: string;

  @ManyToOne(() => Integration, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'integration_id' })
  integration: Integration;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'varchar', length: 50 })
  action: string;

  @Column({ type: 'varchar', length: 10 })
  method: string;

  @Column({ type: 'varchar', length: 500 })
  endpoint: string;

  @Column({ type: 'jsonb', nullable: true })
  requestHeaders: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  requestBody: Record<string, any>;

  @Column({ type: 'int', nullable: true })
  responseStatus: number;

  @Column({ type: 'jsonb', nullable: true })
  responseHeaders: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  responseBody: Record<string, any>;

  @Column({ type: 'int', nullable: true })
  duration: number;

  @Column({ type: 'boolean', default: true })
  success: boolean;

  @Column({ type: 'text', nullable: true })
  error: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  referenceId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}

@Entity('integration_webhooks')
@Index(['integrationId'])
@Index(['organizationId', 'created_at'])
export class IntegrationWebhook extends BaseEntity {
  @Column({ type: 'uuid' })
  integrationId: string;

  @ManyToOne(() => Integration, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'integration_id' })
  integration: Integration;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'varchar', length: 100 })
  event: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  headers: Record<string, string>;

  @Column({ type: 'boolean', default: false })
  processed: boolean;

  @Column({ type: 'boolean', default: false })
  verified: boolean;

  @Column({ type: 'text', nullable: true })
  processingError: string;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date;
}
