import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Map next-intl locale codes to BCP-47 locale tags */
const LOCALE_MAP: Record<string, string> = {
  uz: "uz-UZ",
  ru: "ru-RU",
  en: "en-US",
};

/** Get BCP-47 locale from the document lang attribute, falling back to ru-RU */
function getBrowserLocale(): string {
  if (typeof document !== "undefined") {
    const lang = document.documentElement.lang;
    if (lang && LOCALE_MAP[lang]) return LOCALE_MAP[lang];
  }
  return "ru-RU";
}

export function formatPrice(price: number, currency = "UZS"): string {
  return (
    new Intl.NumberFormat(getBrowserLocale(), {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price) + ` ${currency}`
  );
}

export function formatDate(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(getBrowserLocale(), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...options,
  }).format(d);
}

export function formatTime(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(getBrowserLocale(), {
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  return formatDate(date, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format number with locale-aware thousand separators
 */
export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(getBrowserLocale(), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options,
  }).format(value);
}

/**
 * Format amount as currency string (UZS by default)
 */
export function formatCurrency(amount: number, currency = "UZS"): string {
  return (
    new Intl.NumberFormat(getBrowserLocale(), {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ` ${currency}`
  );
}

/**
 * Format percentage value
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Relative time labels per locale
 */
const TIME_AGO_LABELS: Record<
  string,
  { justNow: string; min: string; h: string; d: string; m: string }
> = {
  uz: {
    justNow: "hozirgina",
    min: "daq oldin",
    h: "soat oldin",
    d: "kun oldin",
    m: "oy oldin",
  },
  ru: {
    justNow: "только что",
    min: "мин назад",
    h: "ч назад",
    d: "дн назад",
    m: "мес назад",
  },
  en: {
    justNow: "just now",
    min: "min ago",
    h: "h ago",
    d: "d ago",
    m: "mo ago",
  },
};

/**
 * Format time difference from now (locale-aware)
 */
export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  const lang =
    typeof document !== "undefined" ? document.documentElement.lang : "ru";
  const labels = TIME_AGO_LABELS[lang] || TIME_AGO_LABELS.ru;

  if (seconds < 60) return labels.justNow;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} ${labels.min}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${labels.h}`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ${labels.d}`;
  const months = Math.floor(days / 30);
  return `${months} ${labels.m}`;
}
