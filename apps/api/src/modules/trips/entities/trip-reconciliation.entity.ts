import {
  Entity,
  Column,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

// ============================================================================
// TRIP RECONCILIATION ENTITY (Mileage verification)
// ============================================================================

@Entity('trip_reconciliations')
@Index(['vehicleId'])
@Index(['performedAt'])
export class TripReconciliation extends BaseEntity {
  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'uuid' })
  vehicleId: string;

  // Odometer readings
  @Column({ type: 'int' })
  actualOdometer: number;

  @Column({ type: 'int' })
  expectedOdometer: number;

  @Column({ type: 'int' })
  differenceKm: number;

  // Anomaly detection
  @Column({ type: 'int' })
  thresholdKm: number;

  @Column({ type: 'boolean' })
  isAnomaly: boolean;

  // Who performed the reconciliation
  @Column({ type: 'uuid' })
  performedById: string;

  @Column({ type: 'timestamp with time zone', default: () => 'now()' })
  performedAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
