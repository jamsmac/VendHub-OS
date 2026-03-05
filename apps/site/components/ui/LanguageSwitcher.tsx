"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const labels: Record<string, string> = {
  ru: "RU",
  uz: "UZ",
};

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: string) => {
    if (newLocale === locale) return;
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="flex items-center rounded-lg bg-foam p-0.5 gap-0.5">
      {routing.locales.map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => switchLocale(loc)}
          className={[
            "px-2.5 py-1 text-xs font-medium rounded-md transition-all",
            loc === locale
              ? "bg-espresso text-cream shadow-sm"
              : "text-espresso/50 hover:text-espresso",
          ].join(" ")}
        >
          {labels[loc] ?? loc.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
