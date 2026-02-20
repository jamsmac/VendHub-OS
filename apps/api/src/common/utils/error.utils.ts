/**
 * Error Utilities
 * Safe error handling utilities for TypeScript strict mode
 */

/**
 * Safely extract error message from unknown error type
 * Use this instead of catch(error: any)
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Unknown error occurred';
}

/**
 * Safely extract error stack from unknown error type
 */
export function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }
  return undefined;
}

/**
 * Convert unknown error to Error instance
 */
export function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(getErrorMessage(error));
}

/**
 * Check if error has a specific code property (common in Node.js errors)
 */
export function hasErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === code
  );
}

/**
 * Check if error is a timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  return (
    hasErrorCode(error, 'ETIMEDOUT') ||
    hasErrorCode(error, 'ESOCKETTIMEDOUT') ||
    (error instanceof Error && error.message.toLowerCase().includes('timeout'))
  );
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  return (
    hasErrorCode(error, 'ECONNREFUSED') ||
    hasErrorCode(error, 'ECONNRESET') ||
    hasErrorCode(error, 'ENOTFOUND') ||
    hasErrorCode(error, 'ENETUNREACH')
  );
}

/**
 * Wrap async function with error logging
 */
export function withErrorLogging<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  logger: { error: (message: string, ...args: unknown[]) => void },
  context?: string,
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return (await fn(...args)) as ReturnType<T>;
    } catch (error) {
      const message = getErrorMessage(error);
      const stack = getErrorStack(error);
      logger.error(`${context ? `[${context}] ` : ''}Error: ${message}`, { stack });
      throw error;
    }
  }) as T;
}
