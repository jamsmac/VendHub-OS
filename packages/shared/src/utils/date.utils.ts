/**
 * Date Utilities for VendHub OS
 */

import { DEFAULT_TIMEZONE, DATE_FORMATS } from '../constants/app.constants';

/**
 * Format date to display string
 */
export function formatDate(
  date: Date | string | number,
  format: keyof typeof DATE_FORMATS = 'DATE'
): string {
  const d = new Date(date);

  if (isNaN(d.getTime())) {
    return '-';
  }

  const options: Intl.DateTimeFormatOptions = {};

  switch (format) {
    case 'DATE':
      options.day = '2-digit';
      options.month = '2-digit';
      options.year = 'numeric';
      break;
    case 'DATE_SHORT':
      options.day = '2-digit';
      options.month = '2-digit';
      break;
    case 'DATE_LONG':
      options.day = 'numeric';
      options.month = 'long';
      options.year = 'numeric';
      break;
    case 'TIME':
      options.hour = '2-digit';
      options.minute = '2-digit';
      break;
    case 'TIME_SECONDS':
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.second = '2-digit';
      break;
    case 'DATETIME':
      options.day = '2-digit';
      options.month = '2-digit';
      options.year = 'numeric';
      options.hour = '2-digit';
      options.minute = '2-digit';
      break;
    case 'DATETIME_LONG':
      options.day = 'numeric';
      options.month = 'long';
      options.year = 'numeric';
      options.hour = '2-digit';
      options.minute = '2-digit';
      break;
  }

  return new Intl.DateTimeFormat('ru-RU', {
    ...options,
    timeZone: DEFAULT_TIMEZONE,
  }).format(d);
}

/**
 * Format date to ISO string
 */
export function toIsoString(date: Date | string | number): string {
  return new Date(date).toISOString();
}

/**
 * Format relative time (e.g., "5 минут назад")
 */
export function formatRelativeTime(date: Date | string | number): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return 'только что';
  }

  if (diffMin < 60) {
    return `${diffMin} ${pluralizeMinutes(diffMin)} назад`;
  }

  if (diffHour < 24) {
    return `${diffHour} ${pluralizeHours(diffHour)} назад`;
  }

  if (diffDay < 7) {
    return `${diffDay} ${pluralizeDays(diffDay)} назад`;
  }

  return formatDate(d, 'DATE');
}

/**
 * Format time ago or future (e.g., "через 5 минут" or "5 минут назад")
 */
export function formatTimeDistance(date: Date | string | number): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const isFuture = diffMs > 0;
  const absDiffMs = Math.abs(diffMs);
  const diffSec = Math.floor(absDiffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  const prefix = isFuture ? 'через ' : '';
  const suffix = isFuture ? '' : ' назад';

  if (diffSec < 60) {
    return isFuture ? 'сейчас' : 'только что';
  }

  if (diffMin < 60) {
    return `${prefix}${diffMin} ${pluralizeMinutes(diffMin)}${suffix}`;
  }

  if (diffHour < 24) {
    return `${prefix}${diffHour} ${pluralizeHours(diffHour)}${suffix}`;
  }

  if (diffDay < 30) {
    return `${prefix}${diffDay} ${pluralizeDays(diffDay)}${suffix}`;
  }

  return formatDate(d, 'DATE');
}

/**
 * Check if date is today
 */
export function isToday(date: Date | string | number): boolean {
  const d = new Date(date);
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if date is yesterday
 */
export function isYesterday(date: Date | string | number): boolean {
  const d = new Date(date);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  );
}

/**
 * Check if date is in the past
 */
export function isPast(date: Date | string | number): boolean {
  return new Date(date).getTime() < Date.now();
}

/**
 * Check if date is in the future
 */
export function isFuture(date: Date | string | number): boolean {
  return new Date(date).getTime() > Date.now();
}

/**
 * Get start of day
 */
export function startOfDay(date: Date | string | number = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of day
 */
export function endOfDay(date: Date | string | number = new Date()): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Get start of week (Monday)
 */
export function startOfWeek(date: Date | string | number = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get start of month
 */
export function startOfMonth(date: Date | string | number = new Date()): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Add days to date
 */
export function addDays(date: Date | string | number, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Add hours to date
 */
export function addHours(date: Date | string | number, hours: number): Date {
  const d = new Date(date);
  d.setTime(d.getTime() + hours * 60 * 60 * 1000);
  return d;
}

/**
 * Add minutes to date
 */
export function addMinutes(date: Date | string | number, minutes: number): Date {
  const d = new Date(date);
  d.setTime(d.getTime() + minutes * 60 * 1000);
  return d;
}

/**
 * Get difference in days between two dates
 */
export function diffInDays(date1: Date | string | number, date2: Date | string | number): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffMs = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get difference in minutes between two dates
 */
export function diffInMinutes(
  date1: Date | string | number,
  date2: Date | string | number
): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffMs = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffMs / (1000 * 60));
}

/**
 * Parse date from Russian format (dd.MM.yyyy)
 */
export function parseDateRu(dateString: string): Date | null {
  const parts = dateString.split('.');
  if (parts.length !== 3) return null;

  const day = parseInt(parts[0] || '0', 10);
  const month = parseInt(parts[1] || '0', 10) - 1;
  const year = parseInt(parts[2] || '0', 10);

  const date = new Date(year, month, day);

  if (isNaN(date.getTime())) return null;

  return date;
}

/**
 * Get date range for period
 */
export function getDateRange(period: string): { from: Date; to: Date } {
  const now = new Date();
  const today = startOfDay(now);

  switch (period) {
    case 'today':
      return { from: today, to: endOfDay(now) };

    case 'yesterday':
      const yesterday = addDays(today, -1);
      return { from: yesterday, to: endOfDay(yesterday) };

    case 'last_7_days':
      return { from: addDays(today, -6), to: endOfDay(now) };

    case 'last_30_days':
      return { from: addDays(today, -29), to: endOfDay(now) };

    case 'this_month':
      return { from: startOfMonth(now), to: endOfDay(now) };

    case 'last_month':
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: startOfDay(lastMonth), to: endOfDay(lastMonthEnd) };

    case 'this_year':
      return { from: new Date(now.getFullYear(), 0, 1), to: endOfDay(now) };

    default:
      return { from: today, to: endOfDay(now) };
  }
}

// Pluralization helpers
function pluralizeMinutes(count: number): string {
  const cases = [2, 0, 1, 1, 1, 2];
  const index = count % 100 > 4 && count % 100 < 20 ? 2 : cases[Math.min(count % 10, 5)]!;
  return ['минуту', 'минуты', 'минут'][index]!;
}

function pluralizeHours(count: number): string {
  const cases = [2, 0, 1, 1, 1, 2];
  const index = count % 100 > 4 && count % 100 < 20 ? 2 : cases[Math.min(count % 10, 5)]!;
  return ['час', 'часа', 'часов'][index]!;
}

function pluralizeDays(count: number): string {
  const cases = [2, 0, 1, 1, 1, 2];
  const index = count % 100 > 4 && count % 100 < 20 ? 2 : cases[Math.min(count % 10, 5)]!;
  return ['день', 'дня', 'дней'][index]!;
}
