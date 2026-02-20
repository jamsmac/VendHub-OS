/**
 * i18n Configuration
 * Internationalization setup using i18next + react-i18next + expo-localization
 * Supports: Russian (ru), Uzbek (uz), English (en)
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";

import ru from "./ru.json";
import en from "./en.json";
import uz from "./uz.json";

const deviceLocales = getLocales();
const deviceLanguage = deviceLocales?.[0]?.languageCode ?? "ru";

// Map device language to supported language
const getSupportedLanguage = (lang: string): string => {
  if (["ru", "en", "uz"].includes(lang)) return lang;
  // Default to Russian for Uzbekistan market
  return "ru";
};

i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
    en: { translation: en },
    uz: { translation: uz },
  },
  lng: getSupportedLanguage(deviceLanguage),
  fallbackLng: "ru",
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;
