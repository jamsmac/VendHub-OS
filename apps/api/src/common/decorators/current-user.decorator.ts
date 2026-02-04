/**
 * Current User Decorator
 * Extracts current authenticated user from request
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface ICurrentUser {
  id: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: string;
  permissions?: string[];
  language?: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof ICurrentUser | undefined, ctx: ExecutionContext): ICurrentUser | any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as ICurrentUser;

    if (!user) {
      return null;
    }

    // If specific property requested, return only that
    if (data) {
      return user[data];
    }

    return user;
  },
);

/**
 * Get user ID only
 */
export const CurrentUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.id || null;
  },
);

/**
 * Get organization ID only
 */
export const CurrentOrganizationId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.organizationId || null;
  },
);
