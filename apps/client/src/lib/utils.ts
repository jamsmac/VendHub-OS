import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistance } from "@vendhub/shared/utils";
import i18n from "../i18n";

export { formatDistance };

/** Map i18n language code to Intl locale string */
function getLocale(): string {
  const lang = i18n.language || "ru";
  const localeMap: Record<string, string> = {
    ru: "ru-RU",
    uz: "uz-UZ",
    en: "en-US",
  };
  return localeMap[lang] || "ru-RU";
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("uz-UZ").format(price) + " UZS";
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function getMachineTypeIcon(type: string): string {
  switch (type) {
    case "coffee":
      return "☕";
    case "snack":
      return "🍫";
    case "drink":
      return "🥤";
    case "combo":
      return "🎰";
    case "ice_cream":
      return "🍦";
    default:
      return "🏪";
  }
}

export function getMachineStatusColor(status: string): string {
  switch (status) {
    case "active":
      return "text-green-600 bg-green-100";
    case "inactive":
      return "text-red-600 bg-red-100";
    case "maintenance":
      return "text-yellow-600 bg-yellow-100";
    default:
      return "text-gray-600 bg-gray-100";
  }
}

export function formatCurrency(amount: number): string {
  const locale = getLocale();
  const currencyLabel = i18n.t("currency");
  return (
    new Intl.NumberFormat(locale, {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) +
    " " +
    currencyLabel
  );
}

export function formatDate(dateString: string, includeTime = false): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };

  if (includeTime) {
    options.hour = "2-digit";
    options.minute = "2-digit";
  }

  return date.toLocaleDateString(getLocale(), options);
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return i18n.t("relativeTimeJustNow");
  if (diffMins < 60)
    return i18n.t("relativeTimeMinutesAgo", { count: diffMins });
  if (diffHours < 24)
    return i18n.t("relativeTimeHoursAgo", { count: diffHours });
  if (diffDays < 7) return i18n.t("relativeTimeDaysAgo", { count: diffDays });

  return formatDate(dateString);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat(getLocale()).format(num);
}
