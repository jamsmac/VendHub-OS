"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { AlertTriangle, RefreshCw } from "lucide-react";

const TEXTS = {
  ru: {
    title: "Что-то пошло не так",
    description: "Произошла ошибка при загрузке страницы. Попробуйте обновить.",
    retry: "Попробовать снова",
  },
  uz: {
    title: "Xatolik yuz berdi",
    description: "Sahifani yuklashda xatolik. Qayta urinib ko'ring.",
    retry: "Qayta urinish",
  },
  en: {
    title: "Something went wrong",
    description:
      "An error occurred while loading the page. Please try refreshing.",
    retry: "Try again",
  },
} as const;

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = useLocale();

  useEffect(() => {
    console.error("Root error:", error);
  }, [error]);

  const t = TEXTS[locale as keyof typeof TEXTS] ?? TEXTS.ru;

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-foam flex items-center justify-center">
          <AlertTriangle size={32} className="text-espresso/40" />
        </div>
        <h2 className="font-display text-2xl text-chocolate font-bold mb-2">
          {t.title}
        </h2>
        <p className="text-chocolate/50 text-sm mb-6">{t.description}</p>
        <button
          type="button"
          onClick={reset}
          className="btn-espresso inline-flex items-center gap-2"
        >
          <RefreshCw size={16} />
          {t.retry}
        </button>
      </div>
    </div>
  );
}
