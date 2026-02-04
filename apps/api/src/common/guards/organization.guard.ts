/**
 * Organization Guard
 * Ensures user can only access resources in their organization
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../decorators/roles.decorator';

export const SKIP_ORG_CHECK_KEY = 'skipOrgCheck';

/**
 * Decorator to skip organization check (for cross-org operations)
 */
export const SkipOrgCheck = () => {
  return (target: any, key?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata(SKIP_ORG_CHECK_KEY, true, descriptor.value);
    } else {
      Reflect.defineMetadata(SKIP_ORG_CHECK_KEY, true, target);
    }
    return descriptor || target;
  };
};

@Injectable()
export class OrganizationGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if organization check should be skipped
    const skipCheck = this.reflector.getAllAndOverride<boolean>(
      SKIP_ORG_CHECK_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return true; // Will be caught by auth guard
    }

    // Super admin can access all organizations
    // (implement based on your requirements)
    if (user.isSuperAdmin) {
      return true;
    }

    // Get organization ID from request
    const orgIdFromParam = request.params.organizationId;
    const orgIdFromQuery = request.query.organizationId;
    const orgIdFromBody = request.body?.organizationId;

    const requestedOrgId = orgIdFromParam || orgIdFromQuery || orgIdFromBody;

    // If no org ID in request, allow (will use user's org in service)
    if (!requestedOrgId) {
      return true;
    }

    // Check if user's organization matches requested organization
    if (requestedOrgId !== user.organizationId) {
      // Check if user has cross-org permissions
      if (this.hasMultiOrgAccess(user)) {
        // Optionally check if org is in user's allowed orgs list
        if (user.allowedOrganizations?.includes(requestedOrgId)) {
          return true;
        }
      }

      throw new ForbiddenException(
        'Нет доступа к данной организации',
      );
    }

    return true;
  }

  /**
   * Check if user has access to multiple organizations
   */
  private hasMultiOrgAccess(user: any): boolean {
    // Owner and Admin of headquarters can access franchise orgs
    if (
      user.organizationType === 'headquarters' &&
      [UserRole.OWNER, UserRole.ADMIN].includes(user.role)
    ) {
      return true;
    }

    // User with explicit multi-org flag
    if (user.hasMultiOrgAccess) {
      return true;
    }

    return false;
  }
}
