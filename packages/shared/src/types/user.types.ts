/**
 * User Types for VendHub OS
 * 7-level role hierarchy with permissions (optimized)
 */

export enum UserRole {
  OWNER = 'owner',           // Владелец платформы (полный доступ ко всем организациям)
  ADMIN = 'admin',           // Администратор организации
  MANAGER = 'manager',       // Менеджер (управление командой)
  OPERATOR = 'operator',     // Оператор (пополнение, инкассация, ремонт, чистка)
  WAREHOUSE = 'warehouse',   // Кладовщик
  ACCOUNTANT = 'accountant', // Бухгалтер
  VIEWER = 'viewer',         // Наблюдатель (только просмотр)
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',       // Ожидает одобрения
}

export interface IUser {
  id: string;
  email: string;
  username?: string;
  phone?: string;
  firstName: string;
  lastName: string;
  patronymic?: string;
  role: UserRole;
  status: UserStatus;
  organizationId: string;
  avatar?: string;

  // Telegram integration
  telegramId?: string;
  telegramUsername?: string;

  // 2FA
  twoFactorEnabled: boolean;
  twoFactorMethod?: TwoFactorMethod;

  // Security
  lastLoginAt?: Date;
  lastLoginIp?: string;
  loginAttempts: number;
  lockedUntil?: Date;
  passwordChangedAt?: Date;
  mustChangePassword: boolean;

  // IP Whitelist
  ipWhitelist?: string[];

  // Preferences
  preferences: IUserPreferences;

  // Approval workflow
  approvedAt?: Date;
  approvedById?: string;

  createdAt: Date;
  updatedAt: Date;
}

export enum TwoFactorMethod {
  TOTP = 'totp',
  SMS = 'sms',
  EMAIL = 'email',
}

export interface IUserPreferences {
  language: 'ru' | 'uz' | 'en';
  timezone: string;
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    push: boolean;
    telegram: boolean;
    sms: boolean;
  };
  dateFormat: string;
  currency: string;
}

export interface IUserSession {
  id: string;
  userId: string;
  refreshTokenHash: string;
  refreshTokenHint: string; // First 16 chars for O(1) lookup
  deviceInfo: IDeviceInfo;
  ipAddress: string;
  lastActivityAt: Date;
  expiresAt: Date;
  isRevoked: boolean;
  revokedAt?: Date;
  revokedReason?: string;
  createdAt: Date;
}

export interface IDeviceInfo {
  os: string;
  osVersion?: string;
  browser: string;
  browserVersion?: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  userAgent: string;
}

export interface ITwoFactorAuth {
  id: string;
  userId: string;
  totpSecret?: string;        // Encrypted with AES-256-GCM
  totpSecretIv?: string;
  smsPhone?: string;
  emailAddress?: string;
  backupCodes?: string[];     // Hashed
  usedBackupCodes?: string[];
  failedAttempts: number;
  lockedUntil?: Date;
  lastUsedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserCreate {
  email: string;
  password: string;
  username?: string;
  phone?: string;
  firstName: string;
  lastName: string;
  patronymic?: string;
  role: UserRole;
  organizationId: string;
  avatar?: string;
  telegramId?: string;
}

export interface IUserUpdate {
  email?: string;
  username?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  patronymic?: string;
  role?: UserRole;
  status?: UserStatus;
  avatar?: string;
  preferences?: Partial<IUserPreferences>;
  ipWhitelist?: string[];
}

export interface IUserProfile extends Omit<IUser, 'organizationId'> {
  organization: {
    id: string;
    name: string;
    slug: string;
    logo?: string;
  };
  permissions: string[];
}

export interface ILoginCredentials {
  email: string;
  password: string;
  totpCode?: string;
  backupCode?: string;
  rememberMe?: boolean;
  deviceInfo?: Partial<IDeviceInfo>;
}

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
}

export interface IAuthResponse {
  user: IUserProfile;
  tokens: IAuthTokens;
  requiresTwoFactor?: boolean;
  twoFactorMethod?: TwoFactorMethod;
  sessionId: string;
}

export interface IPasswordReset {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}

export interface ILoginAttempt {
  id: string;
  email: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  failureReason?: string;
  createdAt: Date;
}

// Role permissions mapping
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.OWNER]: ['*'], // Full platform access

  [UserRole.ADMIN]: [
    // Users
    'users:read', 'users:write', 'users:delete',
    // Machines
    'machines:read', 'machines:write', 'machines:delete',
    // Products
    'products:read', 'products:write', 'products:delete',
    // Inventory
    'inventory:read', 'inventory:write', 'inventory:transfer',
    // Tasks
    'tasks:read', 'tasks:write', 'tasks:delete', 'tasks:assign',
    // Transactions
    'transactions:read',
    // Reports
    'reports:read', 'reports:export',
    // Settings
    'settings:read', 'settings:write',
    // Locations
    'locations:read', 'locations:write', 'locations:delete',
    // Organizations (own)
    'organization:read', 'organization:write',
  ],

  [UserRole.MANAGER]: [
    'users:read',
    'machines:read', 'machines:write',
    'products:read', 'products:price',
    'inventory:read', 'inventory:request',
    'tasks:read', 'tasks:write', 'tasks:assign',
    'transactions:read',
    'reports:read',
    'locations:read',
  ],

  [UserRole.OPERATOR]: [
    'machines:read',
    'products:read',
    'inventory:read:own', 'inventory:write:own',
    'tasks:read:own', 'tasks:execute',
    'locations:read',
  ],

  [UserRole.WAREHOUSE]: [
    'products:read',
    'inventory:read', 'inventory:write',
    'inventory:receive', 'inventory:issue', 'inventory:writeoff',
    'inventory:stocktake',
  ],

  [UserRole.ACCOUNTANT]: [
    'transactions:read',
    'collections:read',
    'reports:read', 'reports:export',
    'fiscal:read',
    'reconciliation:read',
  ],

  [UserRole.VIEWER]: [
    'machines:read',
    'products:read',
    'reports:read:basic',
    'locations:read',
  ],
};

// Role hierarchy (lower index = lower rank)
export const ROLE_HIERARCHY: UserRole[] = [
  UserRole.VIEWER,
  UserRole.ACCOUNTANT,
  UserRole.WAREHOUSE,
  UserRole.OPERATOR,
  UserRole.MANAGER,
  UserRole.ADMIN,
  UserRole.OWNER,
];

// Role labels (Russian)
export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.OWNER]: 'Владелец',
  [UserRole.ADMIN]: 'Администратор',
  [UserRole.MANAGER]: 'Менеджер',
  [UserRole.OPERATOR]: 'Оператор',
  [UserRole.WAREHOUSE]: 'Кладовщик',
  [UserRole.ACCOUNTANT]: 'Бухгалтер',
  [UserRole.VIEWER]: 'Наблюдатель',
};

// Role labels (Uzbek)
export const ROLE_LABELS_UZ: Record<UserRole, string> = {
  [UserRole.OWNER]: 'Egasi',
  [UserRole.ADMIN]: 'Administrator',
  [UserRole.MANAGER]: 'Menejer',
  [UserRole.OPERATOR]: 'Operator',
  [UserRole.WAREHOUSE]: 'Omborchi',
  [UserRole.ACCOUNTANT]: 'Buxgalter',
  [UserRole.VIEWER]: 'Kuzatuvchi',
};

// Status labels
export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  [UserStatus.ACTIVE]: 'Активен',
  [UserStatus.INACTIVE]: 'Неактивен',
  [UserStatus.SUSPENDED]: 'Заблокирован',
  [UserStatus.PENDING]: 'Ожидает одобрения',
};

// Status colors for UI
export const USER_STATUS_COLORS: Record<UserStatus, string> = {
  [UserStatus.ACTIVE]: 'bg-green-100 text-green-800',
  [UserStatus.INACTIVE]: 'bg-gray-100 text-gray-800',
  [UserStatus.SUSPENDED]: 'bg-red-100 text-red-800',
  [UserStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
};

// Default user preferences
export const DEFAULT_USER_PREFERENCES: IUserPreferences = {
  language: 'ru',
  timezone: 'Asia/Tashkent',
  theme: 'system',
  notifications: {
    email: true,
    push: true,
    telegram: true,
    sms: false,
  },
  dateFormat: 'dd.MM.yyyy',
  currency: 'UZS',
};

/**
 * Check if user has permission
 */
export function hasPermission(userRole: UserRole, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[userRole];

  if (permissions.includes('*')) return true;
  if (permissions.includes(permission)) return true;

  // Check wildcard permissions (e.g., 'users:*' matches 'users:read')
  const [resource] = permission.split(':');
  if (permissions.includes(`${resource}:*`)) return true;

  return false;
}

/**
 * Check if role A is higher than role B in hierarchy
 */
export function isRoleHigher(roleA: UserRole, roleB: UserRole): boolean {
  return ROLE_HIERARCHY.indexOf(roleA) > ROLE_HIERARCHY.indexOf(roleB);
}

/**
 * Check if role A is same or higher than role B
 */
export function isRoleSameOrHigher(roleA: UserRole, roleB: UserRole): boolean {
  return ROLE_HIERARCHY.indexOf(roleA) >= ROLE_HIERARCHY.indexOf(roleB);
}

/**
 * Get all roles that user can manage (lower in hierarchy)
 */
export function getManageableRoles(userRole: UserRole): UserRole[] {
  const userIndex = ROLE_HIERARCHY.indexOf(userRole);
  return ROLE_HIERARCHY.filter((_, index) => index < userIndex);
}
