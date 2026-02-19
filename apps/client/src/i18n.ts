import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { ru, uz, en } from "./locales";

const resources = { ru, uz, en };

// Read saved language or detect from browser
const savedLang = (() => {
  try {
    const stored = localStorage.getItem("vendhub-ui");
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.state?.language;
    }
  } catch {}
  return null;
})();

const detectedLang = navigator.language?.startsWith("uz")
  ? "uz"
  : navigator.language?.startsWith("en")
    ? "en"
    : "ru";

i18n.use(initReactI18next).init({
  resources,
  lng: savedLang || detectedLang,
  fallbackLng: "ru",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
