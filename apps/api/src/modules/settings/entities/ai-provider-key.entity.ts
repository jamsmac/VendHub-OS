/**
 * AiProviderKey Entity
 *
 * Stores API keys and configuration for AI providers (OpenAI, Anthropic, etc.).
 * Keys are encrypted at rest. Each organization can have one key per provider.
 * Tracks usage count and last used timestamp for monitoring.
 */

import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum AiProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
  YANDEX = 'yandex',
  CUSTOM = 'custom',
}

@Entity('ai_provider_keys')
@Index(['provider', 'organizationId'], { unique: true, where: '"deleted_at" IS NULL' })
@Index(['organizationId'])
export class AiProviderKey extends BaseEntity {
  @Column({ type: 'varchar', length: 50 })
  provider: AiProvider;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text' })
  apiKey: string; // Encrypted at rest

  @Column({ type: 'varchar', length: 100, nullable: true })
  model: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  baseUrl: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'uuid', nullable: true })
  organizationId: string;

  @Column({ type: 'jsonb', nullable: true, default: {} })
  config: Record<string, any>;

  @Column({ type: 'integer', default: 0 })
  usageCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date;
}
