import {
  Entity,
  Column,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

// ============================================================================
// ENUMS
// ============================================================================

export enum VehicleType {
  COMPANY = 'company',
  PERSONAL = 'personal',
}

export enum VehicleStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
}

// ============================================================================
// VEHICLE ENTITY
// ============================================================================

@Entity('vehicles')
@Index(['organizationId'])
@Index(['ownerEmployeeId'])
@Index(['organizationId', 'plateNumber'], { unique: true, where: '"deleted_at" IS NULL' })
@Index(['status'])
export class Vehicle extends BaseEntity {
  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'uuid', nullable: true })
  ownerEmployeeId: string | null;

  @Column({ type: 'enum', enum: VehicleType, default: VehicleType.COMPANY })
  type: VehicleType;

  @Column({ type: 'varchar', length: 100 })
  brand: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  model: string | null;

  @Column({ type: 'varchar', length: 20 })
  plateNumber: string;

  @Column({ type: 'int', default: 0 })
  currentOdometer: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastOdometerUpdate: Date | null;

  @Column({ type: 'enum', enum: VehicleStatus, default: VehicleStatus.ACTIVE })
  status: VehicleStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}
