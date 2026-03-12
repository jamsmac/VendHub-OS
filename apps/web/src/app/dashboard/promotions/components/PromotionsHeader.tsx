"use client";

import { Download, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface PromotionsHeaderProps {
  onNewPromoClick: () => void;
}

export function PromotionsHeader({ onNewPromoClick }: PromotionsHeaderProps) {
  const t = useTranslations("promotions");
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-espresso-dark font-display">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-espresso-light">{t("subtitle")}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" /> {t("export")}
        </Button>
        <Button
          className="gap-2 bg-espresso hover:bg-espresso-dark"
          onClick={onNewPromoClick}
        >
          <Plus className="h-4 w-4" /> {t("newPromo")}
        </Button>
      </div>
    </div>
  );
}
