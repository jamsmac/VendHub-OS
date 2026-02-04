/**
 * Roles Guard
 * Checks if user has required role(s) for endpoint access
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, PERMISSIONS_KEY, UserRole, ROLE_HIERARCHY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Optional() @Inject('RbacService') private readonly rbacService?: any,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required roles from decorator
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Get required permissions from decorator
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles or permissions specified, allow access
    if (
      (!requiredRoles || requiredRoles.length === 0) &&
      (!requiredPermissions || requiredPermissions.length === 0)
    ) {
      return true;
    }

    // Get user from request
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Доступ запрещен');
    }

    const userRole = user.role as UserRole;

    // Check role-based access
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = requiredRoles.some((role) => {
        if (role === userRole) {
          return true;
        }
        const userLevel = ROLE_HIERARCHY[userRole] || 0;
        const requiredLevel = ROLE_HIERARCHY[role as UserRole] || 100;
        return userLevel >= requiredLevel;
      });

      if (!hasRole) {
        throw new ForbiddenException(
          'Недостаточно прав для выполнения этого действия',
        );
      }
    }

    // Check permission-based access (if RbacService is available)
    if (requiredPermissions && requiredPermissions.length > 0 && this.rbacService) {
      const hasAllPermissions = await Promise.all(
        requiredPermissions.map((permission) =>
          this.rbacService.hasPermission(user.id, permission),
        ),
      );

      if (hasAllPermissions.some((has: boolean) => !has)) {
        throw new ForbiddenException(
          'Недостаточно разрешений для выполнения этого действия',
        );
      }
    }

    return true;
  }
}
