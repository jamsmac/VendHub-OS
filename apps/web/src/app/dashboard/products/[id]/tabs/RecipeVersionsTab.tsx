/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Loader2, Check, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

interface RecipeVersionsTabProps {
  productId: string;
}

export function RecipeVersionsTab({ productId }: RecipeVersionsTabProps) {
  const { data: recipes, isLoading } = useQuery({
    queryKey: ["product-recipes", productId],
    queryFn: async () => {
      const res = await api.get(`/products/${productId}/recipes`);
      return (res.data?.data ?? res.data ?? []) as any[];
    },
  });

  // Get snapshots for the active recipe
  const activeRecipe = recipes?.find((r: any) => r.isActive) || recipes?.[0];

  const { data: snapshots } = useQuery({
    queryKey: ["recipe-snapshots", activeRecipe?.id],
    queryFn: async () => {
      const res = await api.get(
        `/products/${productId}/recipes/${activeRecipe.id}`,
      );
      const recipe = res.data?.data ?? res.data;
      return (recipe?.snapshots ?? []) as any[];
    },
    enabled: !!activeRecipe?.id,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const versions = snapshots || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4" />
          Версии рецепта ({versions.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {versions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Нет сохранённых версий. Версия создаётся при изменении рецепта.
          </p>
        ) : (
          <div className="space-y-3">
            {versions.map((snap: any) => (
              <div
                key={snap.id}
                className="rounded-lg border p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">
                      v{snap.version}
                    </Badge>
                    {snap.validTo === null && (
                      <Badge variant="default" className="text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        Текущая
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {snap.validFrom
                      ? format(new Date(snap.validFrom), "dd.MM.yyyy HH:mm", {
                          locale: ru,
                        })
                      : "—"}
                    {snap.validTo &&
                      ` → ${format(new Date(snap.validTo), "dd.MM.yyyy", {
                        locale: ru,
                      })}`}
                  </span>
                </div>

                {snap.changeReason && (
                  <p className="text-sm text-muted-foreground mb-2">
                    Причина: {snap.changeReason}
                  </p>
                )}

                {/* Snapshot ingredients */}
                {snap.snapshot?.ingredients && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Состав:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {snap.snapshot.ingredients.map(
                        (ing: any, idx: number) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="text-xs"
                          >
                            {ing.ingredientName}: {ing.quantity}{" "}
                            {ing.unitOfMeasure}
                          </Badge>
                        ),
                      )}
                    </div>
                    {snap.snapshot.totalCost !== undefined && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Себестоимость:{" "}
                        {Math.round(snap.snapshot.totalCost).toLocaleString(
                          "ru-RU",
                        )}{" "}
                        сум
                      </p>
                    )}
                  </div>
                )}

                {snap.checksum && (
                  <p className="text-xs font-mono text-muted-foreground mt-1">
                    #{snap.checksum.slice(0, 8)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
