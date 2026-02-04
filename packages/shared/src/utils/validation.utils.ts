/**
 * Validation Utilities for VendHub OS
 */

import { validators } from '../constants/regex.constants';
import { PASSWORD_REQUIREMENTS, STRING_LENGTHS, NUMBER_LIMITS } from '../constants/validation.constants';

/**
 * Validation result type
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate email
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];

  if (!email) {
    errors.push('Email обязателен');
  } else if (!validators.isEmail(email)) {
    errors.push('Некорректный формат email');
  } else if (email.length > STRING_LENGTHS.EMAIL_MAX) {
    errors.push(`Email слишком длинный (максимум ${STRING_LENGTHS.EMAIL_MAX} символов)`);
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate phone number (Uzbekistan)
 */
export function validatePhoneUz(phone: string): ValidationResult {
  const errors: string[] = [];

  if (!phone) {
    errors.push('Телефон обязателен');
  } else {
    const cleaned = phone.replace(/\D/g, '');

    if (cleaned.length === 9) {
      if (!validators.isPhoneUz(`+998${cleaned}`)) {
        errors.push('Некорректный номер телефона');
      }
    } else if (cleaned.length === 12 && cleaned.startsWith('998')) {
      if (!validators.isPhoneUz(`+${cleaned}`)) {
        errors.push('Некорректный номер телефона');
      }
    } else {
      errors.push('Телефон должен быть в формате +998 XX XXX XX XX');
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];

  if (!password) {
    errors.push('Пароль обязателен');
    return { isValid: false, errors };
  }

  if (password.length < PASSWORD_REQUIREMENTS.MIN_LENGTH) {
    errors.push(`Минимум ${PASSWORD_REQUIREMENTS.MIN_LENGTH} символов`);
  }

  if (PASSWORD_REQUIREMENTS.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    errors.push('Должен содержать заглавную букву');
  }

  if (PASSWORD_REQUIREMENTS.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    errors.push('Должен содержать строчную букву');
  }

  if (PASSWORD_REQUIREMENTS.REQUIRE_NUMBER && !/[0-9]/.test(password)) {
    errors.push('Должен содержать цифру');
  }

  if (
    PASSWORD_REQUIREMENTS.REQUIRE_SPECIAL &&
    !new RegExp(`[${PASSWORD_REQUIREMENTS.SPECIAL_CHARS}]`).test(password)
  ) {
    errors.push('Должен содержать специальный символ');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Calculate password strength (0-100)
 */
export function getPasswordStrength(password: string): number {
  if (!password) return 0;

  let strength = 0;

  // Length
  if (password.length >= 8) strength += 20;
  if (password.length >= 12) strength += 10;
  if (password.length >= 16) strength += 10;

  // Character types
  if (/[a-z]/.test(password)) strength += 10;
  if (/[A-Z]/.test(password)) strength += 15;
  if (/[0-9]/.test(password)) strength += 15;
  if (/[^a-zA-Z0-9]/.test(password)) strength += 20;

  return Math.min(strength, 100);
}

/**
 * Validate coordinates
 */
export function validateCoordinates(
  latitude: number,
  longitude: number
): ValidationResult {
  const errors: string[] = [];

  if (!validators.isLatitude(latitude)) {
    errors.push('Некорректная широта (-90 до 90)');
  }

  if (!validators.isLongitude(longitude)) {
    errors.push('Некорректная долгота (-180 до 180)');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate INN (Uzbekistan)
 */
export function validateInnUz(inn: string): ValidationResult {
  const errors: string[] = [];

  if (!inn) {
    errors.push('ИНН обязателен');
  } else if (!validators.isInnUz(inn)) {
    errors.push('ИНН должен содержать 9 цифр');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate SKU
 */
export function validateSku(sku: string): ValidationResult {
  const errors: string[] = [];

  if (!sku) {
    errors.push('SKU обязателен');
  } else if (sku.length < STRING_LENGTHS.SKU_MIN) {
    errors.push(`SKU слишком короткий (минимум ${STRING_LENGTHS.SKU_MIN} символа)`);
  } else if (sku.length > STRING_LENGTHS.SKU_MAX) {
    errors.push(`SKU слишком длинный (максимум ${STRING_LENGTHS.SKU_MAX} символов)`);
  } else if (!validators.isSku(sku)) {
    errors.push('SKU может содержать только буквы, цифры и дефис');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate barcode (EAN-13)
 */
export function validateBarcodeEan13(barcode: string): ValidationResult {
  const errors: string[] = [];

  if (!barcode) {
    return { isValid: true, errors }; // Optional field
  }

  if (!validators.isBarcodeEan13(barcode)) {
    errors.push('Штрихкод должен содержать 13 цифр');
    return { isValid: false, errors };
  }

  // Validate checksum
  const digits = barcode.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += (digits[i] ?? 0) * (i % 2 === 0 ? 1 : 3);
  }
  const checksum = (10 - (sum % 10)) % 10;

  if (checksum !== digits[12]) {
    errors.push('Некорректная контрольная сумма штрихкода');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate price
 */
export function validatePrice(price: number): ValidationResult {
  const errors: string[] = [];

  if (price === undefined || price === null) {
    errors.push('Цена обязательна');
  } else if (price < NUMBER_LIMITS.PRICE_MIN) {
    errors.push('Цена не может быть отрицательной');
  } else if (price > NUMBER_LIMITS.PRICE_MAX) {
    errors.push(`Цена слишком большая (максимум ${NUMBER_LIMITS.PRICE_MAX})`);
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate quantity
 */
export function validateQuantity(quantity: number): ValidationResult {
  const errors: string[] = [];

  if (quantity === undefined || quantity === null) {
    errors.push('Количество обязательно');
  } else if (!Number.isInteger(quantity)) {
    errors.push('Количество должно быть целым числом');
  } else if (quantity < NUMBER_LIMITS.QUANTITY_MIN) {
    errors.push('Количество не может быть отрицательным');
  } else if (quantity > NUMBER_LIMITS.QUANTITY_MAX) {
    errors.push(`Количество слишком большое (максимум ${NUMBER_LIMITS.QUANTITY_MAX})`);
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate required string
 */
export function validateRequiredString(
  value: string,
  fieldName: string,
  minLength = STRING_LENGTHS.NAME_MIN,
  maxLength = STRING_LENGTHS.NAME_MAX
): ValidationResult {
  const errors: string[] = [];

  if (!value || !value.trim()) {
    errors.push(`${fieldName} обязательно`);
  } else {
    const trimmed = value.trim();
    if (trimmed.length < minLength) {
      errors.push(`${fieldName}: минимум ${minLength} символов`);
    }
    if (trimmed.length > maxLength) {
      errors.push(`${fieldName}: максимум ${maxLength} символов`);
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate URL
 */
export function validateUrl(url: string): ValidationResult {
  const errors: string[] = [];

  if (url && !validators.isUrl(url)) {
    errors.push('Некорректный URL');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate slug
 */
export function validateSlug(slug: string): ValidationResult {
  const errors: string[] = [];

  if (!slug) {
    errors.push('Slug обязателен');
  } else if (slug.length < STRING_LENGTHS.SLUG_MIN) {
    errors.push(`Slug слишком короткий (минимум ${STRING_LENGTHS.SLUG_MIN} символа)`);
  } else if (slug.length > STRING_LENGTHS.SLUG_MAX) {
    errors.push(`Slug слишком длинный (максимум ${STRING_LENGTHS.SLUG_MAX} символов)`);
  } else if (!validators.isSlug(slug)) {
    errors.push('Slug может содержать только строчные буквы, цифры и дефис');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate UUID
 */
export function validateUuid(uuid: string): ValidationResult {
  const errors: string[] = [];

  if (!uuid) {
    errors.push('ID обязателен');
  } else if (!validators.isUuid(uuid)) {
    errors.push('Некорректный формат ID');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Combine multiple validation results
 */
export function combineValidations(...results: ValidationResult[]): ValidationResult {
  const errors = results.flatMap((r) => r.errors);
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Check if value is empty (null, undefined, empty string, empty array)
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Check if value is not empty
 */
export function isNotEmpty(value: any): boolean {
  return !isEmpty(value);
}
