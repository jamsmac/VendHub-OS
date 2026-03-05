"use client";

import { ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TOP_PRODUCTS, fmtShort } from "./constants";

export function TopProducts() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Топ товары</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-caramel-dark text-xs"
          >
            Все <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {TOP_PRODUCTS.map((p, i) => (
            <div key={p.name} className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-espresso-50 text-xs font-bold text-espresso">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-espresso-dark truncate">
                    {p.name}
                  </p>
                  <span className="text-xs font-semibold text-espresso-dark ml-2">
                    {fmtShort(p.revenue)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full rounded-full bg-stone-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-caramel to-espresso-light"
                    style={{ width: `${(p.sales / p.maxSales) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-espresso-light mt-0.5">
                  {p.sales} продаж
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
