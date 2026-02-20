/**
 * Parse Pagination Pipe
 * Validates and transforms pagination parameters
 */

import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
} from '@nestjs/common';

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
  sortBy?: string;
  sortOrder: 'ASC' | 'DESC';
}

export interface PaginationQuery {
  page?: string | number;
  limit?: string | number;
  sortBy?: string;
  sortOrder?: string;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const ALLOWED_SORT_ORDERS = ['ASC', 'DESC', 'asc', 'desc'];

@Injectable()
export class ParsePaginationPipe implements PipeTransform<PaginationQuery, PaginationParams> {
  constructor(
    private readonly options?: {
      maxLimit?: number;
      defaultLimit?: number;
      allowedSortFields?: string[];
      defaultSortBy?: string;
      defaultSortOrder?: 'ASC' | 'DESC';
    },
  ) {}

  transform(value: PaginationQuery, _metadata: ArgumentMetadata): PaginationParams {
    const maxLimit = this.options?.maxLimit || MAX_LIMIT;
    const defaultLimit = this.options?.defaultLimit || DEFAULT_LIMIT;

    // Parse page
    let page = DEFAULT_PAGE;
    if (value.page !== undefined) {
      page = parseInt(String(value.page), 10);
      if (isNaN(page) || page < 1) {
        page = DEFAULT_PAGE;
      }
    }

    // Parse limit
    let limit = defaultLimit;
    if (value.limit !== undefined) {
      limit = parseInt(String(value.limit), 10);
      if (isNaN(limit) || limit < 1) {
        limit = defaultLimit;
      }
      if (limit > maxLimit) {
        limit = maxLimit;
      }
    }

    // Calculate offset
    const offset = (page - 1) * limit;

    // Parse sort order
    let sortOrder: 'ASC' | 'DESC' = this.options?.defaultSortOrder || 'DESC';
    if (value.sortOrder && ALLOWED_SORT_ORDERS.includes(value.sortOrder)) {
      sortOrder = value.sortOrder.toUpperCase() as 'ASC' | 'DESC';
    }

    // Parse sort field
    let sortBy = this.options?.defaultSortBy;
    if (value.sortBy) {
      // Validate sort field if allowedSortFields specified
      if (this.options?.allowedSortFields) {
        if (this.options.allowedSortFields.includes(value.sortBy)) {
          sortBy = value.sortBy;
        }
      } else {
        // Basic sanitization - only allow alphanumeric and underscore
        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value.sortBy)) {
          sortBy = value.sortBy;
        }
      }
    }

    return {
      page,
      limit,
      offset,
      sortBy,
      sortOrder,
    };
  }
}

/**
 * Simple pagination with just page and limit
 */
@Injectable()
export class SimplePaginationPipe implements PipeTransform<{ page?: string; limit?: string }, { page: number; limit: number; offset: number }> {
  transform(value: { page?: string; limit?: string }): { page: number; limit: number; offset: number } {
    let page = parseInt(value.page || '1', 10);
    let limit = parseInt(value.limit || '20', 10);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 20;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;

    return {
      page,
      limit,
      offset: (page - 1) * limit,
    };
  }
}

/**
 * Parse limit only (for lists without pagination)
 */
@Injectable()
export class ParseLimitPipe implements PipeTransform<string | undefined, number> {
  constructor(
    private readonly defaultLimit: number = DEFAULT_LIMIT,
    private readonly maxLimit: number = MAX_LIMIT,
  ) {}

  transform(value: string | undefined): number {
    if (!value) {
      return this.defaultLimit;
    }

    let limit = parseInt(value, 10);

    if (isNaN(limit) || limit < 1) {
      limit = this.defaultLimit;
    }

    if (limit > this.maxLimit) {
      limit = this.maxLimit;
    }

    return limit;
  }
}
