"use client";

import { MapPin } from "lucide-react";
import { useTranslations } from "next-intl";

export default function MapLoadingState() {
  const t = useTranslations("machines");

  return (
    <div className="bg-foam rounded-2xl h-64 md:h-96 flex flex-col items-center justify-center animate-pulse">
      <MapPin size={40} className="text-espresso/20 mb-3" />
      <p className="text-chocolate/40 text-sm font-medium">{t("mapLoading")}</p>
    </div>
  );
}
