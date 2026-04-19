"use client";

import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTopProducts } from "@/lib/hooks";
import { TOP_PRODUCTS, fmtShort } from "./constants";

export function TopProducts() {
  const t = useTranslations("dashboardMain");
  const { data: apiProducts } = useTopProducts(30);

  // Map API data to component format, fall back to mock
  const maxSales = apiProducts?.length
    ? Math.max(...apiProducts.map((p) => p.quantity))
    : TOP_PRODUCTS[0].maxSales;

  const products = apiProducts?.length
    ? apiProducts.slice(0, 5).map((p) => ({
        name: p.name,
        sales: p.quantity,
        revenue: p.revenue,
        maxSales,
      }))
    : TOP_PRODUCTS;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>{t("topProducts.title")}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-caramel-dark text-xs"
          >
            {t("topProducts.all")} <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {products.map((p, i) => (
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
                  {t("topProducts.salesCount", { count: p.sales })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
