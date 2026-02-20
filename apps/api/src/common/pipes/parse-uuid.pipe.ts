/**
 * Parse UUID Pipe
 * Validates and transforms UUID parameters
 */

import {
  PipeTransform,
  Injectable,
  BadRequestException,
  ArgumentMetadata,
} from '@nestjs/common';
import { validate as isUUID } from 'uuid';

@Injectable()
export class ParseUUIDPipe implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    if (!value) {
      throw new BadRequestException(
        `${metadata.data || 'Параметр'} обязателен`,
      );
    }

    if (!isUUID(value)) {
      throw new BadRequestException(
        `${metadata.data || 'Параметр'} должен быть валидным UUID`,
      );
    }

    return value;
  }
}

/**
 * Optional UUID Pipe - returns null for empty/invalid UUIDs
 */
@Injectable()
export class ParseOptionalUUIDPipe implements PipeTransform<string | undefined, string | null> {
  transform(value: string | undefined, _metadata: ArgumentMetadata): string | null {
    if (!value || value === 'null' || value === 'undefined') {
      return null;
    }

    if (!isUUID(value)) {
      return null;
    }

    return value;
  }
}

/**
 * UUID Array Pipe - validates array of UUIDs
 */
@Injectable()
export class ParseUUIDArrayPipe implements PipeTransform<string | string[], string[]> {
  transform(value: string | string[], _metadata: ArgumentMetadata): string[] {
    if (!value) {
      return [];
    }

    // Handle comma-separated string
    const values = Array.isArray(value) ? value : value.split(',').map((v) => v.trim());

    const invalidUUIDs = values.filter((v) => v && !isUUID(v));
    if (invalidUUIDs.length > 0) {
      throw new BadRequestException(
        `Невалидные UUID: ${invalidUUIDs.join(', ')}`,
      );
    }

    return values.filter((v) => v && isUUID(v));
  }
}
