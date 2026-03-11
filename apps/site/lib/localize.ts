/**
 * Returns the Uzbek version of a field when locale is 'uz' and the _uz field exists,
 * otherwise falls back to the default (Russian) field.
 */
export function localized<T extends object>(
  item: T,
  field: string,
  locale: string,
): string {
  const obj = item as Record<string, unknown>;
  if (locale === "uz") {
    const uzValue = obj[`${field}_uz`];
    if (uzValue && typeof uzValue === "string") return uzValue;
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
 * Returns the Uzbek version of a JSONB array field (e.g., conditions_uz).
 */
export function localizedArray<T extends object>(
  item: T,
  field: string,
  locale: string,
): string[] {
  const obj = item as Record<string, unknown>;
  if (locale === "uz") {
    const uzValue = obj[`${field}_uz`];
    if (Array.isArray(uzValue) && uzValue.length > 0) return uzValue;
  }
  const value = obj[field];
  return Array.isArray(value) ? value : [];
}
