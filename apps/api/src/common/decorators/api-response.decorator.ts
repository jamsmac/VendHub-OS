/**
 * API Response Decorators
 * Swagger documentation helpers
 */

import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
  getSchemaPath,
  ApiExtraModels,
} from '@nestjs/swagger';

/**
 * Standard paginated response wrapper
 */
export class PaginatedResponseDto<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

/**
 * Standard API response wrapper
 */
export class ApiResponseDto<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  timestamp: string;
}

/**
 * Decorator for standard success response
 */
export const ApiStandardResponse = <TModel extends Type<any>>(
  model: TModel,
  description = 'Success',
) => {
  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      description,
      schema: {
        allOf: [
          {
            properties: {
              success: { type: 'boolean', example: true },
              data: { $ref: getSchemaPath(model) },
              timestamp: { type: 'string', example: new Date().toISOString() },
            },
          },
        ],
      },
    }),
  );
};

/**
 * Decorator for paginated response
 */
export const ApiPaginatedResponse = <TModel extends Type<any>>(
  model: TModel,
  description = 'Paginated list',
) => {
  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      description,
      schema: {
        allOf: [
          {
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
              meta: {
                type: 'object',
                properties: {
                  total: { type: 'number', example: 100 },
                  page: { type: 'number', example: 1 },
                  limit: { type: 'number', example: 20 },
                  totalPages: { type: 'number', example: 5 },
                  hasNextPage: { type: 'boolean', example: true },
                  hasPreviousPage: { type: 'boolean', example: false },
                },
              },
              timestamp: { type: 'string', example: new Date().toISOString() },
            },
          },
        ],
      },
    }),
  );
};

/**
 * Decorator for created response
 */
export const ApiCreated = <TModel extends Type<any>>(
  model: TModel,
  description = 'Created successfully',
) => {
  return applyDecorators(
    ApiExtraModels(model),
    ApiCreatedResponse({
      description,
      schema: {
        allOf: [
          {
            properties: {
              success: { type: 'boolean', example: true },
              data: { $ref: getSchemaPath(model) },
              message: { type: 'string', example: 'Created successfully' },
              timestamp: { type: 'string', example: new Date().toISOString() },
            },
          },
        ],
      },
    }),
  );
};

/**
 * Standard error responses decorator
 */
export const ApiErrorResponses = () => {
  return applyDecorators(
    ApiBadRequestResponse({
      description: 'Bad Request - Validation error',
      schema: {
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Validation failed' },
          errors: {
            type: 'array',
            items: { type: 'string' },
            example: ['Email is required', 'Phone format is invalid'],
          },
          timestamp: { type: 'string', example: new Date().toISOString() },
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized - Invalid or missing token',
      schema: {
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Unauthorized' },
          timestamp: { type: 'string', example: new Date().toISOString() },
        },
      },
    }),
    ApiForbiddenResponse({
      description: 'Forbidden - Insufficient permissions',
      schema: {
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Access denied' },
          timestamp: { type: 'string', example: new Date().toISOString() },
        },
      },
    }),
    ApiNotFoundResponse({
      description: 'Not Found - Resource does not exist',
      schema: {
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Resource not found' },
          timestamp: { type: 'string', example: new Date().toISOString() },
        },
      },
    }),
    ApiInternalServerErrorResponse({
      description: 'Internal Server Error',
      schema: {
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Internal server error' },
          timestamp: { type: 'string', example: new Date().toISOString() },
        },
      },
    }),
  );
};

/**
 * Combined decorator for standard CRUD responses
 */
export const ApiCrudResponses = <TModel extends Type<any>>(model: TModel) => {
  return applyDecorators(
    ApiStandardResponse(model),
    ApiErrorResponses(),
  );
};
