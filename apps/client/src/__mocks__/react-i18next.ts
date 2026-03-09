// Stable references to prevent infinite rerender loops in tests.
// The real react-i18next returns stable function references from useTranslation.
const stableT = (key: string) => key;
const stableI18n = { changeLanguage: () => Promise.resolve() };
const stableResult = { t: stableT, i18n: stableI18n };

export const useTranslation = () => stableResult;
export const Trans = ({ children }: { children: unknown }) => children;
export const initReactI18next = { type: "3rdParty", init: () => {} };
