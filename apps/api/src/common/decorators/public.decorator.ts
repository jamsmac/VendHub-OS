/**
 * Public Route Decorator
 * Marks endpoints that don't require authentication
 */

import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator to mark endpoint as public (no auth required)
 * @example @Public()
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Alias for Public decorator
 */
export const SkipAuth = Public;
