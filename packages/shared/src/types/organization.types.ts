/**
 * Organization Types for VendHub OS
 * Multi-tenant architecture support
 */

export enum OrganizationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  TRIAL = 'trial',
}

export enum SubscriptionPlan {
  FREE = 'free',
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

export interface IOrganization {
  id: string;
  name: string;
  slug: string;
  legalName?: string;
  inn?: string;
  status: OrganizationStatus;
  plan: SubscriptionPlan;
  logo?: string;
  timezone: string;
  currency: string;
  locale: string;
  address?: string;
  phone?: string;
  email?: string;
  webhookUrl?: string;
  apiKey?: string;
  settings: IOrganizationSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrganizationSettings {
  // Notification settings
  notifications: {
    email: boolean;
    telegram: boolean;
    sms: boolean;
  };
  // Inventory settings
  inventory: {
    lowStockThreshold: number;
    criticalStockThreshold: number;
    autoReorderEnabled: boolean;
  };
  // Task settings
  tasks: {
    requirePhotoBefore: boolean;
    requirePhotoAfter: boolean;
    autoAssignEnabled: boolean;
    maxTasksPerOperator: number;
  };
  // Payment settings
  payments: {
    paymeEnabled: boolean;
    clickEnabled: boolean;
    cashEnabled: boolean;
  };
  // Fiscal settings (Uzbekistan)
  fiscal: {
    fiscalEnabled: boolean;
    fiscalApiKey?: string;
    fiscalDeviceId?: string;
  };
}

export interface IOrganizationCreate {
  name: string;
  slug: string;
  legalName?: string;
  inn?: string;
  plan?: SubscriptionPlan;
  timezone?: string;
  currency?: string;
  locale?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface IOrganizationUpdate {
  name?: string;
  legalName?: string;
  inn?: string;
  status?: OrganizationStatus;
  plan?: SubscriptionPlan;
  logo?: string;
  timezone?: string;
  currency?: string;
  locale?: string;
  address?: string;
  phone?: string;
  email?: string;
  webhookUrl?: string;
  settings?: Partial<IOrganizationSettings>;
}

export interface IOrganizationStats {
  totalMachines: number;
  activeMachines: number;
  totalUsers: number;
  totalProducts: number;
  totalTransactions: number;
  revenue: {
    today: number;
    week: number;
    month: number;
  };
  tasksCompleted: {
    today: number;
    week: number;
    month: number;
  };
}

// Default organization settings
export const DEFAULT_ORGANIZATION_SETTINGS: IOrganizationSettings = {
  notifications: {
    email: true,
    telegram: true,
    sms: false,
  },
  inventory: {
    lowStockThreshold: 10,
    criticalStockThreshold: 3,
    autoReorderEnabled: false,
  },
  tasks: {
    requirePhotoBefore: true,
    requirePhotoAfter: true,
    autoAssignEnabled: false,
    maxTasksPerOperator: 20,
  },
  payments: {
    paymeEnabled: true,
    clickEnabled: true,
    cashEnabled: true,
  },
  fiscal: {
    fiscalEnabled: false,
  },
};
