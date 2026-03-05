/**
 * Returns the Uzbek version of a field when locale is 'uz' and the _uz field exists,
 * otherwise falls back to the default (Russian) field.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function localized(item: any, field: string, locale: string): string {
  if (locale === "uz") {
    const uzValue = item[`${field}_uz`];
    if (uzValue && typeof uzValue === "string") return uzValue;
  }
  const value = item[field];
  return typeof value === "string" ? value : "";
}

/** Uzbek translations for common product option names */
const OPTION_NAME_UZ: Record<string, string> = {
  "С сахаром": "Shakarli",
  "Без сахара": "Shakarsiz",
  Ванильный: "Vanilli",
  Карамельный: "Karamelli",
  Кокосовый: "Kokosli",
};

/** Returns localized option name (maps standard RU names to UZ) */
export function localizedOptionName(name: string, locale: string): string {
  if (locale === "uz") return OPTION_NAME_UZ[name] ?? name;
  return name;
}

/**
 * Returns the Uzbek version of a JSONB array field (e.g., conditions_uz).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function localizedArray(
  item: any,
  field: string,
  locale: string,
): string[] {
  if (locale === "uz") {
    const uzValue = item[`${field}_uz`];
    if (Array.isArray(uzValue) && uzValue.length > 0) return uzValue;
  }
  const value = item[field];
  return Array.isArray(value) ? value : [];
}
