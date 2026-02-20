import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiResponse,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';

// ============================================
// Pagination Response Decorator
// ============================================

export interface PaginatedResponseOptions<T> {
  type: Type<T>;
  description?: string;
}

export function ApiPaginatedResponse<T>(options: PaginatedResponseOptions<T>) {
  return applyDecorators(
    ApiExtraModels(options.type),
    ApiResponse({
      status: 200,
      description: options.description || 'Paginated response',
      schema: {
        allOf: [
          {
            properties: {
              items: {
                type: 'array',
                items: { $ref: getSchemaPath(options.type) },
              },
              total: {
                type: 'number',
                example: 100,
              },
              page: {
                type: 'number',
                example: 1,
              },
              limit: {
                type: 'number',
                example: 20,
              },
              totalPages: {
                type: 'number',
                example: 5,
              },
            },
          },
        ],
      },
    }),
  );
}

// ============================================
// Common API Operation Decorators
// ============================================

export function ApiListOperation(options: {
  summary: string;
  description?: string;
}) {
  return applyDecorators(
    ApiOperation({
      summary: options.summary,
      description: options.description,
    }),
    ApiBearerAuth('JWT'),
    ApiQuery({ name: 'page', required: false, type: Number, example: 1 }),
    ApiQuery({ name: 'limit', required: false, type: Number, example: 20 }),
    ApiQuery({ name: 'search', required: false, type: String }),
    ApiQuery({ name: 'sortBy', required: false, type: String }),
    ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] }),
  );
}

export function ApiGetByIdOperation(options: {
  summary: string;
  description?: string;
}) {
  return applyDecorators(
    ApiOperation({
      summary: options.summary,
      description: options.description,
    }),
    ApiBearerAuth('JWT'),
    ApiParam({ name: 'id', type: String, format: 'uuid' }),
    ApiResponse({ status: 404, description: 'Resource not found' }),
  );
}

export function ApiCreateOperation(options: {
  summary: string;
  description?: string;
}) {
  return applyDecorators(
    ApiOperation({
      summary: options.summary,
      description: options.description,
    }),
    ApiBearerAuth('JWT'),
    ApiResponse({ status: 201, description: 'Resource created successfully' }),
    ApiResponse({ status: 400, description: 'Validation error' }),
  );
}

export function ApiUpdateOperation(options: {
  summary: string;
  description?: string;
}) {
  return applyDecorators(
    ApiOperation({
      summary: options.summary,
      description: options.description,
    }),
    ApiBearerAuth('JWT'),
    ApiParam({ name: 'id', type: String, format: 'uuid' }),
    ApiResponse({ status: 200, description: 'Resource updated successfully' }),
    ApiResponse({ status: 400, description: 'Validation error' }),
    ApiResponse({ status: 404, description: 'Resource not found' }),
  );
}

export function ApiDeleteOperation(options: {
  summary: string;
  description?: string;
}) {
  return applyDecorators(
    ApiOperation({
      summary: options.summary,
      description: options.description,
    }),
    ApiBearerAuth('JWT'),
    ApiParam({ name: 'id', type: String, format: 'uuid' }),
    ApiResponse({ status: 200, description: 'Resource deleted successfully' }),
    ApiResponse({ status: 404, description: 'Resource not found' }),
  );
}

// ============================================
// Error Response Decorators
// ============================================

export function ApiErrorResponses() {
  return applyDecorators(
    ApiResponse({
      status: 400,
      description: 'Bad Request',
      schema: {
        properties: {
          statusCode: { type: 'number', example: 400 },
          message: { type: 'string', example: 'Validation failed' },
          errors: {
            type: 'array',
            items: {
              properties: {
                field: { type: 'string', example: 'email' },
                message: { type: 'string', example: 'Invalid email format' },
              },
            },
          },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized',
      schema: {
        properties: {
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: 'Unauthorized' },
        },
      },
    }),
    ApiResponse({
      status: 403,
      description: 'Forbidden',
      schema: {
        properties: {
          statusCode: { type: 'number', example: 403 },
          message: { type: 'string', example: 'Access denied' },
        },
      },
    }),
    ApiResponse({
      status: 500,
      description: 'Internal Server Error',
      schema: {
        properties: {
          statusCode: { type: 'number', example: 500 },
          message: { type: 'string', example: 'Internal server error' },
          requestId: { type: 'string', example: 'req-123456' },
        },
      },
    }),
  );
}

// ============================================
// Auth Decorators
// ============================================

export function ApiPublic() {
  return applyDecorators(
    ApiOperation({ security: [] }),
  );
}

export function ApiAuth() {
  return applyDecorators(
    ApiBearerAuth('JWT'),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
  );
}

export function ApiAdminAuth() {
  return applyDecorators(
    ApiBearerAuth('JWT'),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 403, description: 'Forbidden - Admin access required' }),
  );
}

export function ApiMachineAuth() {
  return applyDecorators(
    ApiBearerAuth('ApiKey'),
    ApiResponse({ status: 401, description: 'Invalid API Key' }),
  );
}
