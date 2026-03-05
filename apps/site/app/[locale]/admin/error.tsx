"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");

  useEffect(() => {
    console.error("[admin]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertTriangle size={48} className="text-red-400 mb-4" />
      <h2 className="text-lg font-bold text-espresso mb-2">
        {t("errorOccurred")}
      </h2>
      <p className="text-sm text-espresso/50 mb-6 max-w-md">
        {error.message || t("errorFallback")}
      </p>
      <button
        type="button"
        onClick={reset}
        className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-espresso to-espresso-light rounded-xl hover:shadow-lg transition-all"
      >
        <RotateCcw size={16} />
        {t("retry")}
      </button>
    </div>
  );
}
