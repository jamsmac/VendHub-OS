import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ru", "uz"],
  defaultLocale: "ru",
  localePrefix: "as-needed",
});
