/**
 * Shared frontend types for VendHub web app
 */

export type UserRole =
  | "owner"
  | "admin"
  | "manager"
  | "operator"
  | "warehouse"
  | "accountant"
  | "viewer";

export type EmployeeStatus = "active" | "inactive" | "suspended" | "invited";

export interface Employee {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  status: EmployeeStatus;
  organizationId: string;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
