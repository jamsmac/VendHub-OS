/**
 * Parse Phone Pipe
 * Validates and normalizes phone numbers (Uzbekistan format)
 */

import {
  PipeTransform,
  Injectable,
  BadRequestException,
  ArgumentMetadata,
} from '@nestjs/common';

// Uzbekistan phone regex patterns
const UZ_PHONE_REGEX = /^\+998[0-9]{9}$/;

// Mobile operator codes
const UZ_MOBILE_CODES = ['90', '91', '93', '94', '95', '97', '98', '99', '33', '88', '77', '55'];

@Injectable()
export class ParsePhonePipe implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    if (!value) {
      throw new BadRequestException(
        `${metadata.data || 'Номер телефона'} обязателен`,
      );
    }

    const normalized = normalizeUzbekPhone(value);

    if (!normalized) {
      throw new BadRequestException(
        `${metadata.data || 'Номер телефона'} имеет неверный формат. Используйте формат +998XXXXXXXXX`,
      );
    }

    return normalized;
  }
}

/**
 * Optional Phone Pipe
 */
@Injectable()
export class ParseOptionalPhonePipe implements PipeTransform<string | undefined, string | null> {
  transform(value: string | undefined, _metadata: ArgumentMetadata): string | null {
    if (!value || value === 'null' || value === 'undefined') {
      return null;
    }

    return normalizeUzbekPhone(value);
  }
}

/**
 * Normalize Uzbek phone number to +998XXXXXXXXX format
 */
export function normalizeUzbekPhone(phone: string): string | null {
  if (!phone) return null;

  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // Handle different formats
  if (cleaned.startsWith('+998')) {
    // Already in correct format
    if (cleaned.length === 13 && UZ_PHONE_REGEX.test(cleaned)) {
      return cleaned;
    }
  } else if (cleaned.startsWith('998')) {
    cleaned = '+' + cleaned;
    if (cleaned.length === 13 && UZ_PHONE_REGEX.test(cleaned)) {
      return cleaned;
    }
  } else if (cleaned.startsWith('8') && cleaned.length === 10) {
    // 8901234567 format
    cleaned = '+998' + cleaned.slice(1);
    if (UZ_PHONE_REGEX.test(cleaned)) {
      return cleaned;
    }
  } else if (cleaned.length === 9) {
    // 901234567 format
    cleaned = '+998' + cleaned;
    if (UZ_PHONE_REGEX.test(cleaned)) {
      return cleaned;
    }
  }

  return null;
}

/**
 * Validate if phone is a valid Uzbek mobile number
 */
export function isValidUzbekMobile(phone: string): boolean {
  const normalized = normalizeUzbekPhone(phone);
  if (!normalized) return false;

  const operatorCode = normalized.slice(4, 6);
  return UZ_MOBILE_CODES.includes(operatorCode);
}

/**
 * Format phone for display
 */
export function formatUzbekPhone(phone: string): string {
  const normalized = normalizeUzbekPhone(phone);
  if (!normalized) return phone;

  // +998 (90) 123-45-67
  return normalized.replace(
    /^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/,
    '+998 ($1) $2-$3-$4',
  );
}

/**
 * Get operator name from phone
 */
export function getOperatorFromPhone(phone: string): string | null {
  const normalized = normalizeUzbekPhone(phone);
  if (!normalized) return null;

  const operatorCode = normalized.slice(4, 6);

  const operators: Record<string, string> = {
    '90': 'Beeline',
    '91': 'Beeline',
    '93': 'Ucell',
    '94': 'Ucell',
    '95': 'Uzmobile',
    '97': 'Ucell',
    '98': 'Ucell',
    '99': 'Ucell',
    '33': 'Humans',
    '88': 'Uztelecom',
    '77': 'Mobi',
    '55': 'Comnet',
  };

  return operators[operatorCode] || null;
}
