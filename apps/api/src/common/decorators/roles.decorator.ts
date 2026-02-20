/**
 * Roles Decorator
 * Defines required roles for endpoint access
 */

import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * User roles in the system
 */
export enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MANAGER = 'manager',
  OPERATOR = 'operator',
  WAREHOUSE = 'warehouse',
  ACCOUNTANT = 'accountant',
  VIEWER = 'viewer',
}

/**
 * Role hierarchy (higher includes all permissions of lower)
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.OWNER]: 100,
  [UserRole.ADMIN]: 90,
  [UserRole.MANAGER]: 70,
  [UserRole.ACCOUNTANT]: 50,
  [UserRole.WAREHOUSE]: 40,
  [UserRole.OPERATOR]: 30,
  [UserRole.VIEWER]: 10,
};

/**
 * Role labels
 */
export const ROLE_LABELS: Record<UserRole, { ru: string; uz: string }> = {
  [UserRole.OWNER]: { ru: 'Владелец', uz: 'Egasi' },
  [UserRole.ADMIN]: { ru: 'Администратор', uz: 'Administrator' },
  [UserRole.MANAGER]: { ru: 'Менеджер', uz: 'Menejer' },
  [UserRole.OPERATOR]: { ru: 'Оператор', uz: 'Operator' },
  [UserRole.WAREHOUSE]: { ru: 'Кладовщик', uz: 'Omborchi' },
  [UserRole.ACCOUNTANT]: { ru: 'Бухгалтер', uz: 'Buxgalter' },
  [UserRole.VIEWER]: { ru: 'Наблюдатель', uz: "Ko'ruvchi" },
};

/**
 * Decorator to specify required roles for an endpoint
 * @example @Roles('owner', 'admin')
 */
export const Roles = (...roles: (UserRole | string)[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Permissions key for metadata
 */
export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to specify required permissions for an endpoint
 * Uses RBAC permission format: "resource:action"
 * @example @Permissions('users:read', 'users:write')
 */
export const Permissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Decorator for owner-only endpoints
 */
export const OwnerOnly = () => Roles(UserRole.OWNER);

/**
 * Decorator for admin-level endpoints
 */
export const AdminOnly = () => Roles(UserRole.OWNER, UserRole.ADMIN);

/**
 * Decorator for manager-level endpoints
 */
export const ManagerOnly = () => Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER);

/**
 * Check if role has higher or equal permission level
 */
export function hasRolePermission(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Get all roles with permission level >= given role
 */
export function getRolesWithPermission(minRole: UserRole): UserRole[] {
  const minLevel = ROLE_HIERARCHY[minRole];
  return Object.entries(ROLE_HIERARCHY)
    .filter(([_, level]) => level >= minLevel)
    .map(([role]) => role as UserRole);
}
