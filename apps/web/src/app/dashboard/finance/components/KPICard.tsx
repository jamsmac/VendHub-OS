"use client";

import { Card, CardContent } from "@/components/ui/card";
import { fmtShort } from "./config";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  label: string;
  value: number;
  change?: number;
  suffix?: string;
  icon: LucideIcon;
  bg: string;
  iconColor: string;
}

export function KPICard({
  label,
  value,
  change,
  suffix,
  icon: Icon,
  bg,
  iconColor,
}: KPICardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <div className={`rounded-lg ${bg} p-2`}>
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
        </div>
        <p className="mt-2 text-xl font-bold text-espresso-dark">
          {fmtShort(value)}
        </p>
        <p className="text-[11px] text-espresso-light">
          {label}
          {change !== undefined && (
            <span className={change >= 0 ? "text-emerald-600" : "text-red-500"}>
              {" "}
              {change >= 0 ? "+" : ""}
              {change}
              {suffix || "%"}
            </span>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
