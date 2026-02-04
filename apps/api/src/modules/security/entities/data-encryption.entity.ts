import { Entity, Column, Index } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum EncryptionAlgorithm {
  AES_256_GCM = 'aes-256-gcm',
  AES_256_CBC = 'aes-256-cbc',
}

export enum EncryptionStatus {
  ACTIVE = 'active',
  ROTATED = 'rotated',
  COMPROMISED = 'compromised',
  EXPIRED = 'expired',
}

@Entity('data_encryption')
@Index(['entityType', 'entityId'])
@Index(['fieldName'])
@Index(['status'])
@Index(['keyVersion'])
export class DataEncryption extends BaseEntity {
  @ApiProperty({ description: 'Entity type (e.g., user, organization)' })
  @Column({ type: 'varchar', length: 100 })
  entityType: string;

  @ApiProperty({ description: 'Entity ID' })
  @Column({ type: 'uuid' })
  entityId: string;

  @ApiProperty({ description: 'Encrypted field name' })
  @Column({ type: 'varchar', length: 100 })
  fieldName: string;

  @ApiProperty({ enum: EncryptionAlgorithm })
  @Column({ type: 'enum', enum: EncryptionAlgorithm, default: EncryptionAlgorithm.AES_256_GCM })
  algorithm: EncryptionAlgorithm;

  @ApiProperty({ description: 'Key version for rotation tracking' })
  @Column({ type: 'int', default: 1 })
  keyVersion: number;

  @ApiPropertyOptional({ description: 'Key identifier (not the key itself)' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  keyIdentifier: string;

  @ApiProperty({ enum: EncryptionStatus })
  @Column({ type: 'enum', enum: EncryptionStatus, default: EncryptionStatus.ACTIVE })
  status: EncryptionStatus;

  @ApiPropertyOptional({ description: 'Last rotation timestamp' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  lastRotatedAt: Date;

  @ApiPropertyOptional({ description: 'Rotation scheduled at' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  nextRotationAt: Date;

  @ApiPropertyOptional()
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
