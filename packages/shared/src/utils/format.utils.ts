/**
 * Formatting Utilities for VendHub OS
 */

import { CURRENCY_CONFIG, type SupportedCurrency } from '../constants/app.constants';

/**
 * Format currency amount
 */
export function formatCurrency(
  amount: number,
  currency: SupportedCurrency = 'UZS',
  showSymbol = true
): string {
  const config = CURRENCY_CONFIG[currency];

  const formatted = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(amount);

  if (!showSymbol) return formatted;

  return config.position === 'before'
    ? `${config.symbol}${formatted}`
    : `${formatted} ${config.symbol}`;
}

/**
 * Format currency amount compact (e.g., 1.5M)
 */
export function formatCurrencyCompact(
  amount: number,
  currency: SupportedCurrency = 'UZS'
): string {
  const config = CURRENCY_CONFIG[currency];

  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1)}B ${config.symbol}`;
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M ${config.symbol}`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(1)}K ${config.symbol}`;
  }

  return formatCurrency(amount, currency);
}

/**
 * Format number with thousand separators
 */
export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals = 0): string {
  return `${formatNumber(value, decimals)}%`;
}

/**
 * Format phone number (Uzbekistan)
 */
export function formatPhoneUz(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 12 && digits.startsWith('998')) {
    return `+${digits.slice(0, 3)} (${digits.slice(3, 5)}) ${digits.slice(5, 8)}-${digits.slice(8, 10)}-${digits.slice(10)}`;
  }

  if (digits.length === 9) {
    return `+998 (${digits.slice(0, 2)}) ${digits.slice(2, 5)}-${digits.slice(5, 7)}-${digits.slice(7)}`;
  }

  return phone;
}

/**
 * Format card number (masked)
 */
export function formatCardMasked(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 12) return cardNumber;

  return `${digits.slice(0, 4)} **** **** ${digits.slice(-4)}`;
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}

/**
 * Format duration in minutes to human readable
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} мин`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) {
    return `${hours} ч`;
  }

  return `${hours} ч ${mins} мин`;
}

/**
 * Format distance in meters
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} м`;
  }

  return `${(meters / 1000).toFixed(1)} км`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length).trim() + suffix;
}

/**
 * Format full name
 */
export function formatFullName(firstName: string, lastName: string, patronymic?: string): string {
  const parts = [lastName, firstName, patronymic].filter(Boolean);
  return parts.join(' ');
}

/**
 * Format initials
 */
export function formatInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/**
 * Format SKU for display
 */
export function formatSku(sku: string): string {
  return sku.toUpperCase();
}

/**
 * Format slot number
 */
export function formatSlotNumber(slot: string | number): string {
  const num = typeof slot === 'string' ? parseInt(slot, 10) : slot;
  return num.toString().padStart(2, '0');
}

/**
 * Pluralize Russian word
 */
export function pluralizeRu(count: number, forms: [string, string, string]): string {
  const cases = [2, 0, 1, 1, 1, 2];
  const index =
    count % 100 > 4 && count % 100 < 20
      ? 2
      : cases[Math.min(count % 10, 5)]!;
  return forms[index]!;
}

/**
 * Common Russian pluralization
 */
export const pluralize = {
  items: (count: number) => pluralizeRu(count, ['товар', 'товара', 'товаров']),
  machines: (count: number) => pluralizeRu(count, ['автомат', 'автомата', 'автоматов']),
  tasks: (count: number) => pluralizeRu(count, ['задача', 'задачи', 'задач']),
  products: (count: number) => pluralizeRu(count, ['продукт', 'продукта', 'продуктов']),
  users: (count: number) => pluralizeRu(count, ['пользователь', 'пользователя', 'пользователей']),
  minutes: (count: number) => pluralizeRu(count, ['минута', 'минуты', 'минут']),
  hours: (count: number) => pluralizeRu(count, ['час', 'часа', 'часов']),
  days: (count: number) => pluralizeRu(count, ['день', 'дня', 'дней']),
};

/**
 * Generate random color for charts/avatars
 */
export function generateColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }

  const h = hash % 360;
  return `hsl(${h}, 65%, 55%)`;
}

/**
 * Format object to query string
 */
export function toQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach((v) => searchParams.append(key, String(v)));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });

  return searchParams.toString();
}
