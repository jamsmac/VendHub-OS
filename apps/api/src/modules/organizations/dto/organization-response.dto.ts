import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Exclude, Expose } from "class-transformer";
import { BaseResponseDto } from "../../../common/dto";
import {
  OrganizationType,
  OrganizationStatus,
  SubscriptionTier,
  ContractType,
  ContractStatus,
  InvitationStatus,
  AuditAction,
} from "../entities/organization.entity";
import { CommissionType } from "../../../common/enums";

/**
 * Organization Response DTO
 * Safe representation of Organization entity
 * EXCLUDES: API keys, webhook secrets, integration credentials, fiscal settings with passwords
 */
@Expose()
export class OrganizationResponseDto extends BaseResponseDto {
  @ApiProperty({ description: "Organization name" })
  @Expose()
  name: string;

  @ApiPropertyOptional({ description: "Organization name in Uzbek" })
  @Expose()
  nameUz?: string;

  @ApiProperty({ description: "URL slug" })
  @Expose()
  slug: string;

  @ApiPropertyOptional({ description: "Logo URL" })
  @Expose()
  logo?: string;

  @ApiPropertyOptional({ description: "Description" })
  @Expose()
  description?: string;

  @ApiProperty({ description: "Organization type", enum: OrganizationType })
  @Expose()
  type: OrganizationType;

  @ApiProperty({ description: "Organization status", enum: OrganizationStatus })
  @Expose()
  status: OrganizationStatus;

  @ApiPropertyOptional({ description: "Parent organization ID" })
  @Expose()
  parentId?: string;

  @ApiProperty({ description: "Hierarchy level (0 = root)" })
  @Expose()
  hierarchyLevel: number;

  @ApiPropertyOptional({ description: "Hierarchy path" })
  @Expose()
  hierarchyPath?: string;

  @ApiPropertyOptional({ description: "Email address" })
  @Expose()
  email?: string;

  @ApiPropertyOptional({ description: "Phone number" })
  @Expose()
  phone?: string;

  @ApiPropertyOptional({ description: "Secondary phone number" })
  @Expose()
  phoneSecondary?: string;

  @ApiPropertyOptional({ description: "Office address" })
  @Expose()
  address?: string;

  @ApiPropertyOptional({ description: "City" })
  @Expose()
  city?: string;

  @ApiPropertyOptional({ description: "Region" })
  @Expose()
  region?: string;

  @ApiPropertyOptional({ description: "Postal code" })
  @Expose()
  postalCode?: string;

  @ApiPropertyOptional({ description: "Latitude (GPS)" })
  @Expose()
  latitude?: number;

  @ApiPropertyOptional({ description: "Longitude (GPS)" })
  @Expose()
  longitude?: number;

  @ApiPropertyOptional({ description: "Tax ID (INN)" })
  @Expose()
  inn?: string;

  @ApiPropertyOptional({ description: "Personal ID (PINFL)" })
  @Expose()
  pinfl?: string;

  @ApiPropertyOptional({ description: "Bank code (MFO)" })
  @Expose()
  mfo?: string;

  @ApiPropertyOptional({ description: "Bank account number" })
  @Expose()
  bankAccount?: string;

  @ApiPropertyOptional({ description: "Bank name" })
  @Expose()
  bankName?: string;

  @ApiPropertyOptional({ description: "Economic activity classifier" })
  @Expose()
  okonx?: string;

  @ApiPropertyOptional({ description: "Director name" })
  @Expose()
  directorName?: string;

  @ApiPropertyOptional({ description: "Accountant name" })
  @Expose()
  accountantName?: string;

  @ApiProperty({ description: "Subscription tier", enum: SubscriptionTier })
  @Expose()
  subscriptionTier: SubscriptionTier;

  @ApiPropertyOptional({ description: "Subscription start date" })
  @Expose()
  subscriptionStartDate?: Date;

  @ApiPropertyOptional({ description: "Subscription expiration date" })
  @Expose()
  subscriptionExpiresAt?: Date;

  @ApiProperty({ description: "Trial period already used" })
  @Expose()
  isTrialUsed: boolean;

  @ApiProperty({
    description: "Subscription limits",
    type: "object",
    additionalProperties: true,
  })
  @Expose()
  limits: {
    maxMachines: number;
    maxUsers: number;
    maxProducts: number;
    maxLocations: number;
    maxTransactionsPerMonth: number;
    maxStorageMb: number;
    features: string[];
  };

  @ApiProperty({
    description: "Current usage",
    type: "object",
    additionalProperties: true,
  })
  @Expose()
  usage: {
    machines: number;
    users: number;
    products: number;
    locations: number;
    storageUsedMb: number;
    transactionsThisMonth: number;
    lastCalculatedAt?: Date;
  };

  @ApiProperty({
    description: "Organization settings",
    type: "object",
    additionalProperties: true,
  })
  @Expose()
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

  @ApiPropertyOptional({
    description: "Commission settings (for franchises)",
    type: "object",
    additionalProperties: true,
  })
  @Expose()
  commissionSettings?: {
    type: CommissionType;
    rate?: number;
    fixedAmount?: number;
    tiers?: Array<{
      minAmount: number;
      maxAmount: number;
      rate: number;
    }>;
    paymentTermDays: number;
    minimumMonthlyFee?: number;
  };

  @ApiProperty({ description: "Organization is active" })
  @Expose()
  isActive: boolean;

  @ApiProperty({ description: "Organization is verified" })
  @Expose()
  isVerified: boolean;

  @ApiPropertyOptional({ description: "Verification timestamp" })
  @Expose()
  verifiedAt?: Date;

  @ApiPropertyOptional({ description: "User ID who verified this org" })
  @Expose()
  verifiedByUserId?: string;

  @ApiProperty({
    description: "Metadata",
    type: "object",
    additionalProperties: true,
  })
  @Expose()
  metadata: Record<string, unknown>;

  // Computed properties
  @ApiProperty({ description: "Is headquarters" })
  @Expose()
  get isHeadquarters(): boolean {
    return this.type === OrganizationType.HEADQUARTERS;
  }

  @ApiProperty({ description: "Is franchise" })
  @Expose()
  get isFranchise(): boolean {
    return this.type === OrganizationType.FRANCHISE;
  }

  @ApiProperty({ description: "Is subscription active" })
  @Expose()
  get isSubscriptionActive(): boolean {
    if (!this.subscriptionExpiresAt)
      return this.subscriptionTier === SubscriptionTier.FREE;
    return new Date() < this.subscriptionExpiresAt;
  }

  @ApiProperty({ description: "Can add machine" })
  @Expose()
  get canAddMachine(): boolean {
    if (!this.limits.maxMachines) return true;
    return (this.usage.machines || 0) < this.limits.maxMachines;
  }

  @ApiProperty({ description: "Can add user" })
  @Expose()
  get canAddUser(): boolean {
    if (!this.limits.maxUsers) return true;
    return (this.usage.users || 0) < this.limits.maxUsers;
  }

  // ====== EXCLUDED SENSITIVE FIELDS ======
  @Exclude()
  fiscalSettings?: {
    terminalId?: string;
    terminalPassword?: string; // PASSWORD!
    cashRegisterId?: string;
    ofdProvider?: string;
    autoFiscalize?: boolean;
    printReceipts?: boolean;
  };

  @Exclude()
  apiKeys?: Array<{
    id?: string;
    key?: string; // API KEY!
    name?: string;
    scopes?: string[];
    expiresAt?: Date;
    lastUsedAt?: Date;
    isActive?: boolean;
    createdAt?: Date;
    createdByUserId?: string;
  }>;

  @Exclude()
  webhooks?: Array<{
    id?: string;
    url?: string;
    events?: string[];
    secret?: string; // WEBHOOK SECRET!
    isActive?: boolean;
    lastTriggeredAt?: Date;
    failureCount?: number;
    createdAt?: Date;
  }>;

  @Exclude()
  integrations?: {
    payme?: { merchantId?: string; secretKey?: string; isActive?: boolean }; // SECRET KEY!
    click?: {
      merchantId?: string;
      serviceId?: string;
      secretKey?: string;
      isActive?: boolean;
    }; // SECRET KEY!
    telegram?: { botToken?: string; chatId?: string; isActive?: boolean }; // BOT TOKEN!
    sms?: {
      provider?: string;
      apiKey?: string;
      senderId?: string;
      isActive?: boolean;
    }; // API KEY!
    myId?: { clientId?: string; clientSecret?: string; isActive?: boolean }; // CLIENT SECRET!
  };

  @Exclude()
  parent?: Record<string, unknown>;

  @Exclude()
  children?: Record<string, unknown>[];

  @Exclude()
  users?: Record<string, unknown>[];

  @Exclude()
  machines?: Record<string, unknown>[];

  @Exclude()
  locations?: Record<string, unknown>[];

  @Exclude()
  contracts?: Record<string, unknown>[];
}

/**
 * Organization Contract Response DTO
 */
@Expose()
export class OrganizationContractResponseDto extends BaseResponseDto {
  @ApiProperty({ description: "Organization ID" })
  @Expose()
  organizationId: string;

  @ApiPropertyOptional({ description: "Counterparty organization ID" })
  @Expose()
  counterpartyId?: string;

  @ApiProperty({ description: "Contract number" })
  @Expose()
  contractNumber: string;

  @ApiProperty({ description: "Contract type", enum: ContractType })
  @Expose()
  contractType: ContractType;

  @ApiProperty({ description: "Contract status", enum: ContractStatus })
  @Expose()
  status: ContractStatus;

  @ApiPropertyOptional({ description: "Contract subject" })
  @Expose()
  subject?: string;

  @ApiProperty({ description: "Start date" })
  @Expose()
  startDate: Date;

  @ApiPropertyOptional({ description: "End date" })
  @Expose()
  endDate?: Date;

  @ApiPropertyOptional({ description: "Signing date" })
  @Expose()
  signedDate?: Date;

  @ApiProperty({ description: "Auto-renew enabled" })
  @Expose()
  autoRenew: boolean;

  @ApiPropertyOptional({ description: "Renewal period in months" })
  @Expose()
  renewalPeriodMonths?: number;

  @ApiPropertyOptional({ description: "Commission type", enum: CommissionType })
  @Expose()
  commissionType?: CommissionType;

  @ApiPropertyOptional({ description: "Commission rate (%)" })
  @Expose()
  commissionRate?: number;

  @ApiPropertyOptional({ description: "Fixed amount" })
  @Expose()
  fixedAmount?: number;

  @ApiPropertyOptional({
    description: "Commission tiers",
    type: "object",
    isArray: true,
    additionalProperties: true,
  })
  @Expose()
  commissionTiers?: Array<{
    minAmount: number;
    maxAmount: number;
    rate: number;
  }>;

  @ApiPropertyOptional({ description: "Minimum monthly fee" })
  @Expose()
  minimumMonthlyFee?: number;

  @ApiPropertyOptional({ description: "Franchise fee" })
  @Expose()
  franchiseFee?: number;

  @ApiPropertyOptional({ description: "Deposit amount" })
  @Expose()
  deposit?: number;

  @ApiProperty({ description: "Payment term days" })
  @Expose()
  paymentTermDays: number;

  @ApiProperty({ description: "Currency" })
  @Expose()
  currency: string;

  @ApiPropertyOptional({
    description: "Territory (for exclusive franchise)",
    type: "object",
    additionalProperties: true,
  })
  @Expose()
  territory?: {
    regions?: string[];
    cities?: string[];
    isExclusive: boolean;
    radius?: number;
    centerLat?: number;
    centerLng?: number;
  };

  @ApiProperty({
    description: "Attached documents",
    type: "object",
    isArray: true,
    additionalProperties: true,
  })
  @Expose()
  documents: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    uploadedAt: Date;
    uploadedByUserId: string;
  }>;

  @ApiPropertyOptional({ description: "Terms and conditions" })
  @Expose()
  termsAndConditions?: string;

  @ApiPropertyOptional({
    description: "Contact information",
    type: "object",
    additionalProperties: true,
  })
  @Expose()
  contacts?: {
    primary: { name: string; phone: string; email: string; position: string };
    secondary?: {
      name: string;
      phone: string;
      email: string;
      position: string;
    };
  };

  @ApiPropertyOptional({ description: "Notes" })
  @Expose()
  notes?: string;

  @ApiProperty({
    description: "Metadata",
    type: "object",
    additionalProperties: true,
  })
  @Expose()
  metadata: Record<string, unknown>;

  @ApiProperty({ description: "Is contract expired (computed)" })
  @Expose()
  get isExpired(): boolean {
    if (!this.endDate) return false;
    return new Date() > this.endDate;
  }

  @ApiProperty({ description: "Is contract expiring soon (computed)" })
  @Expose()
  get isExpiringSoon(): boolean {
    if (!this.endDate) return false;
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return new Date() < this.endDate && this.endDate < thirtyDaysFromNow;
  }

  @ApiPropertyOptional({ description: "Days until expiry (computed)" })
  @Expose()
  get daysUntilExpiry(): number | null {
    if (!this.endDate) return null;
    const diff = this.endDate.getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  @Exclude()
  organization?: Record<string, unknown>;
}

/**
 * Organization Invitation Response DTO
 */
@Expose()
export class OrganizationInvitationResponseDto extends BaseResponseDto {
  @ApiProperty({ description: "Organization ID" })
  @Expose()
  organizationId: string;

  @ApiProperty({ description: "Invited email address" })
  @Expose()
  email: string;

  @ApiPropertyOptional({ description: "First name" })
  @Expose()
  firstName?: string;

  @ApiPropertyOptional({ description: "Last name" })
  @Expose()
  lastName?: string;

  @ApiProperty({ description: "Invited role" })
  @Expose()
  role: string;

  @ApiProperty({ description: "Invitation status", enum: InvitationStatus })
  @Expose()
  status: InvitationStatus;

  @ApiPropertyOptional({ description: "Personal message from inviter" })
  @Expose()
  message?: string;

  @ApiProperty({ description: "Expiration timestamp" })
  @Expose()
  expiresAt: Date;

  @ApiPropertyOptional({ description: "Acceptance timestamp" })
  @Expose()
  acceptedAt?: Date;

  @ApiPropertyOptional({ description: "User ID who accepted" })
  @Expose()
  acceptedByUserId?: string;

  @ApiProperty({ description: "User ID who sent invitation" })
  @Expose()
  invitedByUserId: string;

  @ApiProperty({
    description: "Metadata",
    type: "object",
    additionalProperties: true,
  })
  @Expose()
  metadata: Record<string, unknown>;

  @ApiProperty({ description: "Is invitation expired (computed)" })
  @Expose()
  get isExpired(): boolean {
    return (
      this.status === InvitationStatus.PENDING && new Date() > this.expiresAt
    );
  }

  @ApiProperty({ description: "Is invitation valid (computed)" })
  @Expose()
  get isValid(): boolean {
    return (
      this.status === InvitationStatus.PENDING && new Date() < this.expiresAt
    );
  }

  // ====== EXCLUDED SENSITIVE FIELDS ======
  @Exclude()
  token?: string; // Invitation token is sensitive

  @Exclude()
  organization?: Record<string, unknown>;
}

/**
 * Organization Audit Log Response DTO
 */
@Expose()
export class OrganizationAuditLogResponseDto extends BaseResponseDto {
  @ApiProperty({ description: "Organization ID" })
  @Expose()
  organizationId: string;

  @ApiPropertyOptional({ description: "User ID who performed the action" })
  @Expose()
  userId?: string;

  @ApiProperty({ description: "Action performed", enum: AuditAction })
  @Expose()
  action: AuditAction;

  @ApiProperty({ description: "Type of entity affected" })
  @Expose()
  entityType: string;

  @ApiPropertyOptional({ description: "Entity ID affected" })
  @Expose()
  entityId?: string;

  @ApiPropertyOptional({ description: "Action description" })
  @Expose()
  description?: string;

  @ApiProperty({
    description: "Old values before change",
    type: "object",
    nullable: true,
    additionalProperties: true,
  })
  @Expose()
  oldValues?: Record<string, unknown>;

  @ApiProperty({
    description: "New values after change",
    type: "object",
    nullable: true,
    additionalProperties: true,
  })
  @Expose()
  newValues?: Record<string, unknown>;

  @ApiProperty({
    description: "Context of the action",
    type: "object",
    nullable: true,
    additionalProperties: true,
  })
  @Expose()
  context?: {
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    requestId?: string;
  };

  @Exclude()
  organization?: Record<string, unknown>;
}
