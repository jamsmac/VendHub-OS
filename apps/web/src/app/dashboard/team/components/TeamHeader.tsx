"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface TeamHeaderProps {
  onInviteClick: () => void;
}

export function TeamHeader({ onInviteClick }: TeamHeaderProps) {
  const t = useTranslations("team");
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-espresso-dark font-display">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-espresso-light">{t("subtitle")}</p>
      </div>
      <Button
        className="gap-2 bg-espresso hover:bg-espresso-dark"
        onClick={onInviteClick}
      >
        <Plus className="h-4 w-4" />
        {t("invite")}
      </Button>
    </div>
  );
}
