"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";

interface MapErrorStateProps {
  message: string;
  onRetry: () => void;
}

export default function MapErrorState({
  message,
  onRetry,
}: MapErrorStateProps) {
  const t = useTranslations("machines");

  return (
    <div className="bg-foam rounded-2xl h-64 md:h-96 flex flex-col items-center justify-center gap-3">
      <AlertTriangle size={40} className="text-espresso/30" />
      <p className="text-chocolate/50 text-sm font-medium">{message}</p>
      <Button variant="ghost" size="sm" onClick={onRetry}>
        {t("mapRetry")}
      </Button>
    </div>
  );
}
