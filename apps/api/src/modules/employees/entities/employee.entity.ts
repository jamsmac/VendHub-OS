/**
 * Employee Entity
 * Сотрудники организации (отдельно от Users)
 */

import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Department } from './department.entity';
import { Position } from './position.entity';

// ============================================================================
// ENUMS
// ============================================================================

export enum EmployeeRole {
  OPERATOR = 'operator',
  TECHNICIAN = 'technician',
  WAREHOUSE = 'warehouse',
  DRIVER = 'driver',
  MANAGER = 'manager',
  ACCOUNTANT = 'accountant',
  SUPERVISOR = 'supervisor',
}

export enum EmployeeStatus {
  ACTIVE = 'active',
  ON_LEAVE = 'on_leave',
  SUSPENDED = 'suspended',
  TERMINATED = 'terminated',
}

export enum SalaryFrequency {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
}

// ============================================================================
// EMPLOYEE ENTITY
// ============================================================================

@Entity('employees')
@Index(['organizationId', 'status'])
@Index(['employeeNumber'], { unique: true })
@Index(['telegramUserId'])
export class Employee extends BaseEntity {
  @Column()
  @Index()
  organizationId: string;

  @Column({ nullable: true })
  userId: string; // Link to User (optional)

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ unique: true })
  employeeNumber: string; // EMP-001

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  @Column({ length: 100, nullable: true })
  middleName: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 255, nullable: true })
  email: string;

  @Column({
    type: 'enum',
    enum: EmployeeRole,
  })
  employeeRole: EmployeeRole;

  @Column({
    type: 'enum',
    enum: EmployeeStatus,
    default: EmployeeStatus.ACTIVE,
  })
  status: EmployeeStatus;

  @Column({ nullable: true })
  telegramUserId: string;

  @Column({ length: 100, nullable: true })
  telegramUsername: string;

  @Column({ type: 'date' })
  hireDate: Date;

  @Column({ type: 'date', nullable: true })
  terminationDate: Date;

  @Column({ type: 'text', nullable: true })
  terminationReason: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  salary: number;

  @Column({
    type: 'enum',
    enum: SalaryFrequency,
    nullable: true,
  })
  salaryFrequency: SalaryFrequency;

  // Department & Position
  @Column({ type: 'uuid', nullable: true })
  departmentId: string | null;

  @Column({ type: 'uuid', nullable: true })
  positionId: string | null;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @ManyToOne(() => Position, { nullable: true })
  @JoinColumn({ name: 'position_id' })
  position: Position;

  // Address
  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ length: 100, nullable: true })
  city: string;

  @Column({ length: 100, nullable: true })
  district: string;

  // Emergency contact
  @Column({ length: 200, nullable: true })
  emergencyContactName: string;

  @Column({ length: 20, nullable: true })
  emergencyContactPhone: string;

  @Column({ length: 100, nullable: true })
  emergencyContactRelation: string;

  // Documents
  @Column({ type: 'jsonb', nullable: true })
  documents: {
    type: string;
    name: string;
    url: string;
    uploadedAt: Date;
  }[];

  // Notes
  @Column({ type: 'text', nullable: true })
  notes: string;

  // Metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}

// ============================================================================
// EMPLOYEE DOCUMENT ENTITY
// ============================================================================

@Entity('employee_documents')
@Index(['employeeId', 'documentType'])
export class EmployeeDocument extends BaseEntity {
  @Column()
  employeeId: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ length: 50 })
  documentType: string; // passport, contract, medical, certificate

  @Column({ length: 255 })
  name: string;

  @Column({ length: 500 })
  url: string;

  @Column({ type: 'date', nullable: true })
  expiryDate: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
