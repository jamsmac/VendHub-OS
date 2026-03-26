/**
 * Sanitize Pipe
 *
 * Strips HTML tags and dangerous characters from string fields
 * in request DTOs to prevent Stored XSS attacks.
 *
 * Applied globally via main.ts or per-controller.
 */

import { PipeTransform, Injectable, ArgumentMetadata } from "@nestjs/common";

@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    // Only sanitize body payloads (not query params or route params)
    if (
      metadata.type !== "body" ||
      typeof value !== "object" ||
      value === null
    ) {
      return value;
    }

    return this.sanitizeObject(value);
  }

  private sanitizeObject(obj: unknown): unknown {
    if (typeof obj === "string") {
      return this.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item));
    }

    if (typeof obj === "object" && obj !== null) {
      const sanitized: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(obj)) {
        sanitized[key] = this.sanitizeObject(val);
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Sanitize a string value:
   * - Strip HTML tags (prevents XSS)
   * - Remove null bytes
   * - Trim whitespace
   */
  private sanitizeString(str: string): string {
    return (
      str
        // Remove null bytes
        .replace(/\0/g, "")
        // Strip HTML tags (basic XSS prevention)
        .replace(/<[^>]*>/g, "")
        // Remove javascript: protocol
        .replace(/javascript\s*:/gi, "")
        // Remove data: protocol (except safe data URIs for images)
        .replace(/data\s*:[^image/][^;]*;/gi, "")
        // Trim leading/trailing whitespace
        .trim()
    );
  }
}
