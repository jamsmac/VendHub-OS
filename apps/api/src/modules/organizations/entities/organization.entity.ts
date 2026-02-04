/**
 * Organization Entities for VendHub OS
 * Multi-tenant franchise system with hierarchy and contracts
 */

import {
  Entity,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
  BeforeInsert,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

// ============================================================================
// ENUMS
// ============================================================================

export enum OrganizationType {
  HEADQUARTERS = 'headquarters', // Main company (parent of all)
  FRANCHISE = 'franchise', // Franchisee
  BRANCH = 'branch', // Company branch
  OPERATOR = 'operator', // Independent operator
  PARTNER = 'partner', // Business partner
}

export enum OrganizationStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
  TERMINATED = 'terminated',
}

export enum SubscriptionTier {
  FREE = 'free',
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
  CUSTOM = 'custom',
}

export enum ContractType {
  FRANCHISE = 'franchise',
  PARTNERSHIP = 'partnership',
  LEASE = 'lease',
  SERVICE = 'service',
}

export enum ContractStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  EXPIRED = 'expired',
  TERMINATED = 'terminated',
}

export enum CommissionType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
  TIERED = 'tiered',
  HYBRID = 'hybrid',
}

// ============================================================================
// ORGANIZATION ENTITY
// ============================================================================

@Entity('organizations')
@Index(['slug'], { unique: true, where: '"deleted_at" IS NULL' })
@Index(['parentId'])
@Index(['type'])
@Index(['status'])
@Index(['inn'], { unique: true, where: '"inn" IS NOT NULL AND "deleted_at" IS NULL' })
export class Organization extends BaseEntity {
  // Basic info
  @Column({ length: 200 })
  name: string;

  @Column({ length: 200, nullable: true })
  nameUz: string;

  @Column({ length: 100 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  logo: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Type and hierarchy
  @Column({ type: 'enum', enum: OrganizationType, default: OrganizationType.OPERATOR })
  type: OrganizationType;

  @Column({ type: 'enum', enum: OrganizationStatus, default: OrganizationStatus.PENDING })
  status: OrganizationStatus;

  @Column({ nullable: true })
  parentId: string;

  @Column({ type: 'int', default: 0 })
  hierarchyLevel: number; // 0 = root, 1 = child, etc.

  @Column({ type: 'text', nullable: true })
  hierarchyPath: string; // e.g., "/root-uuid/parent-uuid/this-uuid"

  // Contact info
  @Column({ length: 255, nullable: true })
  email: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 20, nullable: true })
  phoneSecondary: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ length: 100, nullable: true })
  city: string;

  @Column({ length: 100, nullable: true })
  region: string;

  @Column({ length: 20, nullable: true })
  postalCode: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number;

  // Legal info (Uzbekistan)
  @Column({ length: 20, nullable: true })
  inn: string; // Tax ID (INN)

  @Column({ length: 20, nullable: true })
  pinfl: string; // Personal ID for individuals

  @Column({ length: 20, nullable: true })
  mfo: string; // Bank code

  @Column({ length: 50, nullable: true })
  bankAccount: string;

  @Column({ length: 200, nullable: true })
  bankName: string;

  @Column({ length: 20, nullable: true })
  okonx: string; // Economic activity classifier

  @Column({ length: 100, nullable: true })
  directorName: string;

  @Column({ length: 100, nullable: true })
  accountantName: string;

  // Fiscal data (OFD Integration)
  @Column({ type: 'jsonb', nullable: true })
  fiscalSettings: {
    terminalId?: string;
    terminalPassword?: string;
    cashRegisterId?: string;
    ofdProvider?: string;
    autoFiscalize?: boolean;
    printReceipts?: boolean;
  };

  // Subscription
  @Column({ type: 'enum', enum: SubscriptionTier, default: SubscriptionTier.FREE })
  subscriptionTier: SubscriptionTier;

  @Column({ type: 'timestamp', nullable: true })
  subscriptionStartDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  subscriptionExpiresAt: Date;

  @Column({ default: false })
  isTrialUsed: boolean;

  // Limits based on subscription
  @Column({ type: 'jsonb', default: {} })
  limits: {
    maxMachines: number;
    maxUsers: number;
    maxProducts: number;
    maxLocations: number;
    maxTransactionsPerMonth: number;
    maxStorageMb: number;
    features: string[];
  };

  // Current usage (cached, updated periodically)
  @Column({ type: 'jsonb', default: {} })
  usage: {
    machines: number;
    users: number;
    products: number;
    locations: number;
    storageUsedMb: number;
    transactionsThisMonth: number;
    lastCalculatedAt?: Date;
  };

  // Settings
  @Column({ type: 'jsonb', default: {} })
  settings: {
    timezone: string;
    currency: string;
    language: string;
    defaultVatRate: number;
    dateFormat: string;
    timeFormat: string;
    workingHours?: {
      start: string;
      end: string;
      daysOfWeek: number[];
    };
    notifications: {
      email: boolean;
      telegram: boolean;
      sms: boolean;
      lowStock: boolean;
      machineOffline: boolean;
      taskOverdue: boolean;
      dailyReport: boolean;
    };
    branding?: {
      primaryColor: string;
      secondaryColor: string;
      logoUrl: string;
      faviconUrl: string;
    };
  };

  // Commission settings (for franchises)
  @Column({ type: 'jsonb', nullable: true })
  commissionSettings: {
    type: CommissionType;
    rate?: number; // Percentage
    fixedAmount?: number;
    tiers?: {
      minAmount: number;
      maxAmount: number;
      rate: number;
    }[];
    paymentTermDays: number;
    minimumMonthlyFee?: number;
  };

  // API Keys for integrations
  @Column({ type: 'jsonb', default: [] })
  apiKeys: {
    id: string;
    key: string;
    name: string;
    scopes: string[];
    expiresAt?: Date;
    lastUsedAt?: Date;
    isActive: boolean;
    createdAt: Date;
    createdByUserId: string;
  }[];

  // Webhooks
  @Column({ type: 'jsonb', default: [] })
  webhooks: {
    id: string;
    url: string;
    events: string[];
    secret: string;
    isActive: boolean;
    lastTriggeredAt?: Date;
    failureCount: number;
    createdAt: Date;
  }[];

  // Integrations
  @Column({ type: 'jsonb', default: {} })
  integrations: {
    payme?: { merchantId: string; secretKey: string; isActive: boolean };
    click?: { merchantId: string; serviceId: string; secretKey: string; isActive: boolean };
    telegram?: { botToken: string; chatId: string; isActive: boolean };
    sms?: { provider: string; apiKey: string; senderId: string; isActive: boolean };
    myId?: { clientId: string; clientSecret: string; isActive: boolean }; // myID.uz auth
  };

  // Metadata
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  // Activity flags
  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date;

  @Column({ nullable: true })
  verifiedByUserId: string;

  // Relations
  @ManyToOne('Organization', 'children', { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_id' })
  parent: Organization;

  @OneToMany('Organization', 'parent')
  children: Organization[];

  @OneToMany('User', 'organization')
  users: import('../../users/entities/user.entity').User[];

  @OneToMany('Machine', 'organization')
  machines: import('../../machines/entities/machine.entity').Machine[];

  @OneToMany('Location', 'organization')
  locations: import('../../locations/entities/location.entity').Location[];

  @OneToMany('OrganizationContract', 'organization')
  contracts: OrganizationContract[];

  // Auto-generate slug
  @BeforeInsert()
  generateSlug() {
    if (!this.slug) {
      const base = this.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const random = Math.random().toString(36).substring(2, 6);
      this.slug = `${base}-${random}`;
    }
  }

  // Computed
  get isHeadquarters(): boolean {
    return this.type === OrganizationType.HEADQUARTERS;
  }

  get isFranchise(): boolean {
    return this.type === OrganizationType.FRANCHISE;
  }

  get isSubscriptionActive(): boolean {
    if (!this.subscriptionExpiresAt) return this.subscriptionTier === SubscriptionTier.FREE;
    return new Date() < this.subscriptionExpiresAt;
  }

  get canAddMachine(): boolean {
    if (!this.limits.maxMachines) return true;
    return (this.usage.machines || 0) < this.limits.maxMachines;
  }

  get canAddUser(): boolean {
    if (!this.limits.maxUsers) return true;
    return (this.usage.users || 0) < this.limits.maxUsers;
  }
}

// ============================================================================
// ORGANIZATION CONTRACT ENTITY
// ============================================================================

@Entity('organization_contracts')
@Index(['organizationId'])
@Index(['counterpartyId'])
@Index(['contractNumber'], { unique: true, where: '"deleted_at" IS NULL' })
@Index(['status'])
@Index(['endDate'])
export class OrganizationContract extends BaseEntity {
  @Column()
  organizationId: string;

  @Column({ nullable: true })
  counterpartyId: string; // Other organization or external counterparty

  @Column({ length: 50 })
  contractNumber: string;

  @Column({ type: 'enum', enum: ContractType })
  contractType: ContractType;

  @Column({ type: 'enum', enum: ContractStatus, default: ContractStatus.DRAFT })
  status: ContractStatus;

  @Column({ length: 500, nullable: true })
  subject: string;

  // Dates
  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ type: 'date', nullable: true })
  signedDate: Date;

  @Column({ default: false })
  autoRenew: boolean;

  @Column({ type: 'int', nullable: true })
  renewalPeriodMonths: number;

  // Financial terms
  @Column({ type: 'enum', enum: CommissionType, nullable: true })
  commissionType: CommissionType;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  commissionRate: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  fixedAmount: number;

  @Column({ type: 'jsonb', nullable: true })
  commissionTiers: {
    minAmount: number;
    maxAmount: number;
    rate: number;
  }[];

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  minimumMonthlyFee: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  franchiseFee: number; // One-time franchise fee

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  deposit: number;

  @Column({ type: 'int', default: 30 })
  paymentTermDays: number;

  @Column({ length: 3, default: 'UZS' })
  currency: string;

  // Territory (for exclusive franchise)
  @Column({ type: 'jsonb', nullable: true })
  territory: {
    regions?: string[];
    cities?: string[];
    isExclusive: boolean;
    radius?: number; // km
    centerLat?: number;
    centerLng?: number;
  };

  // Documents
  @Column({ type: 'jsonb', default: [] })
  documents: {
    id: string;
    name: string;
    type: string;
    url: string;
    uploadedAt: Date;
    uploadedByUserId: string;
  }[];

  // Terms and conditions
  @Column({ type: 'text', nullable: true })
  termsAndConditions: string;

  // Contacts
  @Column({ type: 'jsonb', nullable: true })
  contacts: {
    primary: { name: string; phone: string; email: string; position: string };
    secondary?: { name: string; phone: string; email: string; position: string };
  };

  // Notes
  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  // Relations
  @ManyToOne('Organization', 'contracts', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  // Computed
  get isExpired(): boolean {
    if (!this.endDate) return false;
    return new Date() > this.endDate;
  }

  get isExpiringSoon(): boolean {
    if (!this.endDate) return false;
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return new Date() < this.endDate && this.endDate < thirtyDaysFromNow;
  }

  get daysUntilExpiry(): number | null {
    if (!this.endDate) return null;
    const diff = this.endDate.getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
}

// ============================================================================
// ORGANIZATION INVITATION ENTITY
// ============================================================================

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Entity('organization_invitations')
@Index(['organizationId'])
@Index(['email'])
@Index(['token'], { unique: true })
@Index(['status'])
export class OrganizationInvitation extends BaseEntity {
  @Column()
  organizationId: string;

  @Column({ length: 255 })
  email: string;

  @Column({ length: 100, nullable: true })
  firstName: string;

  @Column({ length: 100, nullable: true })
  lastName: string;

  @Column({ length: 50 })
  role: string; // UserRole

  @Column({ length: 100 })
  token: string;

  @Column({ type: 'enum', enum: InvitationStatus, default: InvitationStatus.PENDING })
  status: InvitationStatus;

  @Column({ type: 'text', nullable: true })
  message: string; // Personal message from inviter

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  acceptedAt: Date;

  @Column({ nullable: true })
  acceptedByUserId: string;

  @Column()
  invitedByUserId: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  // Relations
  @ManyToOne('Organization', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  // Computed
  get isExpired(): boolean {
    return this.status === InvitationStatus.PENDING && new Date() > this.expiresAt;
  }

  get isValid(): boolean {
    return this.status === InvitationStatus.PENDING && new Date() < this.expiresAt;
  }
}

// ============================================================================
// ORGANIZATION AUDIT LOG ENTITY
// ============================================================================

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  INVITE = 'invite',
  ROLE_CHANGE = 'role_change',
  SETTINGS_CHANGE = 'settings_change',
  SUBSCRIPTION_CHANGE = 'subscription_change',
  API_KEY_CREATE = 'api_key_create',
  API_KEY_REVOKE = 'api_key_revoke',
}

@Entity('organization_audit_logs')
@Index(['organizationId'])
@Index(['userId'])
@Index(['action'])
@Index(['createdAt'])
@Index(['entityType', 'entityId'])
export class OrganizationAuditLog extends BaseEntity {
  @Column()
  organizationId: string;

  @Column({ nullable: true })
  userId: string;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column({ length: 100 })
  entityType: string; // 'user', 'machine', 'task', etc.

  @Column({ nullable: true })
  entityId: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  oldValues: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  newValues: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  context: {
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    requestId?: string;
  };

  // Relations
  @ManyToOne('Organization', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;
}

// ============================================================================
// DEFAULT SUBSCRIPTION LIMITS
// ============================================================================

export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, Organization['limits']> = {
  [SubscriptionTier.FREE]: {
    maxMachines: 3,
    maxUsers: 2,
    maxProducts: 50,
    maxLocations: 3,
    maxTransactionsPerMonth: 1000,
    maxStorageMb: 100,
    features: ['basic_reports', 'telegram_notifications'],
  },
  [SubscriptionTier.STARTER]: {
    maxMachines: 10,
    maxUsers: 5,
    maxProducts: 200,
    maxLocations: 10,
    maxTransactionsPerMonth: 10000,
    maxStorageMb: 500,
    features: ['basic_reports', 'telegram_notifications', 'email_notifications', 'api_access'],
  },
  [SubscriptionTier.PROFESSIONAL]: {
    maxMachines: 50,
    maxUsers: 20,
    maxProducts: 1000,
    maxLocations: 50,
    maxTransactionsPerMonth: 100000,
    maxStorageMb: 2000,
    features: [
      'advanced_reports',
      'telegram_notifications',
      'email_notifications',
      'sms_notifications',
      'api_access',
      'webhooks',
      'fiscal_integration',
      'multi_warehouse',
    ],
  },
  [SubscriptionTier.ENTERPRISE]: {
    maxMachines: 0, // unlimited
    maxUsers: 0,
    maxProducts: 0,
    maxLocations: 0,
    maxTransactionsPerMonth: 0,
    maxStorageMb: 0,
    features: [
      'advanced_reports',
      'telegram_notifications',
      'email_notifications',
      'sms_notifications',
      'api_access',
      'webhooks',
      'fiscal_integration',
      'multi_warehouse',
      'white_label',
      'dedicated_support',
      'custom_integrations',
      'franchise_management',
    ],
  },
  [SubscriptionTier.CUSTOM]: {
    maxMachines: 0,
    maxUsers: 0,
    maxProducts: 0,
    maxLocations: 0,
    maxTransactionsPerMonth: 0,
    maxStorageMb: 0,
    features: [],
  },
};
