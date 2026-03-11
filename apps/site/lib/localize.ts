/**
 * Returns the localized version of a field (e.g. field_uz, field_en).
 * Falls back to the default (Russian) field if no locale-specific variant exists.
 */
export function localized<T extends object>(
  item: T,
  field: string,
  locale: string,
): string {
  const obj = item as Record<string, unknown>;
  if (locale !== "ru") {
    const localizedValue = obj[`${field}_${locale}`];
    if (localizedValue && typeof localizedValue === "string")
      return localizedValue;
  }
  const value = obj[field];
  return typeof value === "string" ? value : "";
}

/** Translations for common product option names (keyed by Russian name) */
const OPTION_NAMES: Record<string, Record<string, string>> = {
  "С сахаром": { uz: "Shakarli", en: "With sugar" },
  "Без сахара": { uz: "Shakarsiz", en: "No sugar" },
  Ванильный: { uz: "Vanilli", en: "Vanilla" },
  Карамельный: { uz: "Karamelli", en: "Caramel" },
  Кокосовый: { uz: "Kokosli", en: "Coconut" },
};

/** Returns localized option name (maps standard RU names to target locale) */
export function localizedOptionName(name: string, locale: string): string {
  if (locale === "ru") return name;
  return OPTION_NAMES[name]?.[locale] ?? name;
}

/**
 * Returns the localized version of a JSONB array field (e.g., conditions_uz, conditions_en).
 */
export function localizedArray<T extends object>(
  item: T,
  field: string,
  locale: string,
): string[] {
  const obj = item as Record<string, unknown>;
  if (locale !== "ru") {
    const localizedValue = obj[`${field}_${locale}`];
    if (Array.isArray(localizedValue) && localizedValue.length > 0)
      return localizedValue;
  }
  const value = obj[field];
  return Array.isArray(value) ? value : [];
}
