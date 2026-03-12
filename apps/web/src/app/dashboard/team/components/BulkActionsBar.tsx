"use client";

import { useTranslations } from "next-intl";
import { Shield, Building, UserX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface BulkActionsBarProps {
  count: number;
  onClear: () => void;
}

export function BulkActionsBar({ count, onClear }: BulkActionsBarProps) {
  const t = useTranslations("team");

  if (count === 0) return null;

  return (
    <Card className="coffee-card border-amber-200 bg-amber-50/50">
      <CardContent className="p-4 flex items-center justify-between">
        <span className="text-sm font-medium text-espresso-dark">
          {t("bulkSelected", { count })}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Shield className="h-4 w-4" />
            {t("bulkRole")}
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Building className="h-4 w-4" />
            {t("bulkZone")}
          </Button>
          <Button variant="outline" size="sm" className="gap-2 text-red-600">
            <UserX className="h-4 w-4" />
            {t("bulkDeactivate")}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClear}>
            {t("bulkClear")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
