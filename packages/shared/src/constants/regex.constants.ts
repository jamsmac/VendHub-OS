/**
 * Regular Expression Constants for VendHub OS
 */

// Email validation
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Phone validation (Uzbekistan format)
export const PHONE_UZ_REGEX = /^\+998[0-9]{9}$/;
export const PHONE_INTERNATIONAL_REGEX = /^\+[1-9][0-9]{6,14}$/;

// Password validation patterns
export const PASSWORD_UPPERCASE_REGEX = /[A-Z]/;
export const PASSWORD_LOWERCASE_REGEX = /[a-z]/;
export const PASSWORD_NUMBER_REGEX = /[0-9]/;
export const PASSWORD_SPECIAL_REGEX = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/;

// URL validation
export const URL_REGEX = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
export const URL_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// UUID validation
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Alphanumeric patterns
export const ALPHANUMERIC_REGEX = /^[a-zA-Z0-9]+$/;
export const ALPHANUMERIC_DASH_REGEX = /^[a-zA-Z0-9-]+$/;
export const ALPHANUMERIC_UNDERSCORE_REGEX = /^[a-zA-Z0-9_]+$/;

// Numeric patterns
export const DIGITS_ONLY_REGEX = /^\d+$/;
export const DECIMAL_REGEX = /^\d+\.?\d*$/;
export const INTEGER_REGEX = /^-?\d+$/;

// Time patterns
export const TIME_24H_REGEX = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
export const TIME_12H_REGEX = /^(0?[1-9]|1[0-2]):[0-5][0-9] ?([AaPp][Mm])$/;

// Date patterns
export const DATE_ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const DATE_RU_REGEX = /^\d{2}\.\d{2}\.\d{4}$/;

// Uzbekistan specific
export const INN_UZ_REGEX = /^\d{9}$/;
export const PINFL_UZ_REGEX = /^\d{14}$/;
export const PASSPORT_UZ_REGEX = /^[A-Z]{2}\d{7}$/;

// Card numbers
export const UZCARD_REGEX = /^8600[0-9]{12}$/;
export const HUMO_REGEX = /^9860[0-9]{12}$/;
export const CARD_GENERIC_REGEX = /^[0-9]{16}$/;

// Product codes
export const SKU_REGEX = /^[A-Z0-9-]{3,50}$/i;
export const BARCODE_EAN13_REGEX = /^\d{13}$/;
export const BARCODE_EAN8_REGEX = /^\d{8}$/;
export const BARCODE_UPC_REGEX = /^\d{12}$/;

// Uzbekistan tax codes
export const MXIK_CODE_REGEX = /^\d{17}$/;
export const IKPU_CODE_REGEX = /^\d{17}$/;

// Machine serial number
export const SERIAL_NUMBER_REGEX = /^[A-Z0-9-]{5,50}$/i;

// Coordinates
export const LATITUDE_REGEX = /^-?([0-8]?[0-9]|90)(\.[0-9]{1,8})?$/;
export const LONGITUDE_REGEX = /^-?((1?[0-7]?|[0-9]?)[0-9]|180)(\.[0-9]{1,8})?$/;

// File extensions
export const IMAGE_EXTENSION_REGEX = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
export const DOCUMENT_EXTENSION_REGEX = /\.(pdf|doc|docx|xls|xlsx|txt)$/i;

// HTML/Script detection (for XSS prevention)
export const HTML_TAG_REGEX = /<[^>]*>/g;
export const SCRIPT_TAG_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;

// Whitespace normalization
export const MULTIPLE_SPACES_REGEX = /\s+/g;
export const TRIM_LINES_REGEX = /^\s+|\s+$/gm;

// Color codes
export const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
export const RGB_COLOR_REGEX = /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/i;
export const RGBA_COLOR_REGEX = /^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(0|1|0?\.\d+)\s*\)$/i;

/**
 * Validation helper functions
 */
export const validators = {
  isEmail: (value: string): boolean => EMAIL_REGEX.test(value),
  isPhoneUz: (value: string): boolean => PHONE_UZ_REGEX.test(value),
  isPhoneInternational: (value: string): boolean => PHONE_INTERNATIONAL_REGEX.test(value),
  isUrl: (value: string): boolean => URL_REGEX.test(value),
  isSlug: (value: string): boolean => URL_SLUG_REGEX.test(value),
  isUuid: (value: string): boolean => UUID_REGEX.test(value),
  isInnUz: (value: string): boolean => INN_UZ_REGEX.test(value),
  isPinflUz: (value: string): boolean => PINFL_UZ_REGEX.test(value),
  isPassportUz: (value: string): boolean => PASSPORT_UZ_REGEX.test(value),
  isUzcard: (value: string): boolean => UZCARD_REGEX.test(value.replace(/\s/g, '')),
  isHumo: (value: string): boolean => HUMO_REGEX.test(value.replace(/\s/g, '')),
  isSku: (value: string): boolean => SKU_REGEX.test(value),
  isBarcodeEan13: (value: string): boolean => BARCODE_EAN13_REGEX.test(value),
  isSerialNumber: (value: string): boolean => SERIAL_NUMBER_REGEX.test(value),
  isMxikCode: (value: string): boolean => MXIK_CODE_REGEX.test(value),
  isIkpuCode: (value: string): boolean => IKPU_CODE_REGEX.test(value),
  isLatitude: (value: number): boolean => value >= -90 && value <= 90,
  isLongitude: (value: number): boolean => value >= -180 && value <= 180,
  isTime24h: (value: string): boolean => TIME_24H_REGEX.test(value),
  isDateIso: (value: string): boolean => DATE_ISO_REGEX.test(value),
  isHexColor: (value: string): boolean => HEX_COLOR_REGEX.test(value),
  hasHtmlTags: (value: string): boolean => HTML_TAG_REGEX.test(value),
  hasScriptTags: (value: string): boolean => SCRIPT_TAG_REGEX.test(value),
};

/**
 * Sanitization helper functions
 */
export const sanitizers = {
  stripHtmlTags: (value: string): string => value.replace(HTML_TAG_REGEX, ''),
  normalizeSpaces: (value: string): string => value.replace(MULTIPLE_SPACES_REGEX, ' ').trim(),
  toSlug: (value: string): string =>
    value
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, ''),
  formatPhoneUz: (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('998')) {
      return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
    }
    if (digits.length === 9) {
      return `+998 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7)}`;
    }
    return value;
  },
  formatCardNumber: (value: string): string => {
    const digits = value.replace(/\D/g, '');
    return digits.replace(/(.{4})/g, '$1 ').trim();
  },
};
