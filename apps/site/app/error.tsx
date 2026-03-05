"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-foam flex items-center justify-center">
          <AlertTriangle size={32} className="text-espresso/40" />
        </div>
        <h2 className="font-display text-2xl text-chocolate font-bold mb-2">
          Xatolik yuz berdi / Что-то пошло не так
        </h2>
        <p className="text-chocolate/50 text-sm mb-6">
          Sahifani yuklashda xatolik. Qayta urinib ko&apos;ring / Произошла
          ошибка. Попробуйте обновить.
        </p>
        <button
          type="button"
          onClick={reset}
          className="btn-espresso inline-flex items-center gap-2"
        >
          <RefreshCw size={16} />
          Qayta urinish / Попробовать снова
        </button>
      </div>
    </div>
  );
}
