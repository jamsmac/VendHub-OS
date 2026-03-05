"use client";

import { useEffect } from "react";
import { Coffee, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");

  useEffect(() => {
    console.error("[page]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-foam flex items-center justify-center">
        <Coffee size={32} className="text-espresso/40" />
      </div>
      <h2 className="font-display text-xl font-bold text-espresso mb-2">
        {t("errorOccurred")}
      </h2>
      <p className="text-sm text-chocolate/50 mb-6 max-w-md">
        {t("errorFallback")}
      </p>
      <button
        type="button"
        onClick={reset}
        className="btn-espresso inline-flex items-center gap-2"
      >
        <RotateCcw size={16} />
        {t("retry")}
      </button>
    </div>
  );
}
