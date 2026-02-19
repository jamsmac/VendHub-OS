"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useLocale } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { locales, localeNames, type Locale } from "@/i18n/config";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onLocaleChange(newLocale: string) {
    // Set cookie and refresh
    document.cookie = `locale=${newLocale};path=/;max-age=${60 * 60 * 24 * 365}`;
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <Select value={locale} onValueChange={onLocaleChange} disabled={isPending}>
      <SelectTrigger className="w-[130px] h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {locales.map((loc) => (
          <SelectItem key={loc} value={loc} className="text-xs">
            {localeNames[loc as Locale]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
