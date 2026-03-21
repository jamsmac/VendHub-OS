/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileText,
  ChefHat,
  History,
  Package,
  BarChart3,
  Clock,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { productsApi } from "@/lib/api";
import { RecipeTab } from "./tabs/RecipeTab";
import { RecipeVersionsTab } from "./tabs/RecipeVersionsTab";
import { TimelineTab } from "../../machines/[id]/tabs/TimelineTab";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const res = await productsApi.getById(id);
      return res.data?.data ?? res.data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Товар не найден
      </div>
    );
  }

  const isRecipe = product.isIngredient === false;
  const typeLabel = product.isIngredient ? "Ингредиент" : "Товар";

  return (
    <div className="space-y-0">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 -mx-4 sm:-mx-6 sm:px-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/products">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">{product.name}</h1>
                <Badge variant="outline">{typeLabel}</Badge>
                <Badge variant={product.isActive ? "default" : "secondary"}>
                  {product.isActive ? "Активен" : "Неактивен"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                SKU: {product.sku}
                {product.category && ` · ${product.category}`}
                {product.sellingPrice > 0 &&
                  ` · ${Number(product.sellingPrice).toLocaleString("ru-RU")} сум`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={isRecipe ? "recipe" : "general"} className="mt-4">
        <TabsList className="grid grid-cols-3 lg:grid-cols-6 w-full">
          <TabsTrigger value="general" className="text-xs">
            <FileText className="h-3.5 w-3.5 mr-1" />
            Общие
          </TabsTrigger>
          {isRecipe && (
            <TabsTrigger value="recipe" className="text-xs">
              <ChefHat className="h-3.5 w-3.5 mr-1" />
              Рецепт
            </TabsTrigger>
          )}
          {isRecipe && (
            <TabsTrigger value="versions" className="text-xs">
              <History className="h-3.5 w-3.5 mr-1" />
              Версии
            </TabsTrigger>
          )}
          <TabsTrigger value="batches" className="text-xs">
            <Package className="h-3.5 w-3.5 mr-1" />
            Партии
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs">
            <BarChart3 className="h-3.5 w-3.5 mr-1" />
            Аналитика
          </TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs">
            <Clock className="h-3.5 w-3.5 mr-1" />
            Лента
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          {/* General Info */}
          <TabsContent value="general">
            <GeneralTab product={product} />
          </TabsContent>

          {/* Recipe Constructor */}
          {isRecipe && (
            <TabsContent value="recipe">
              <RecipeTab productId={id} />
            </TabsContent>
          )}

          {/* Recipe Versions */}
          {isRecipe && (
            <TabsContent value="versions">
              <RecipeVersionsTab productId={id} />
            </TabsContent>
          )}

          {/* Batches */}
          <TabsContent value="batches">
            <BatchesTab productId={id} />
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics">
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Продажи по периодам, маржа, топ автоматов
                <br />
                <span className="text-xs">(Recharts — следующий этап)</span>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Timeline */}
          <TabsContent value="timeline">
            <TimelineTab entityId={id} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// ============================================================================
// General Tab
// ============================================================================

function GeneralTab({ product }: { product: any }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <Field label="Название" value={product.name} />
            <Field label="Название (уз)" value={product.nameUz} />
            <Field label="SKU" value={product.sku} mono />
            <Field label="Категория" value={product.category} />
            <Field label="Единица" value={product.unitOfMeasure} />
            <Field label="Штрих-код" value={product.barcode} mono />
            <Field
              label="Цена закупки"
              value={
                product.purchasePrice
                  ? `${Number(product.purchasePrice).toLocaleString("ru-RU")} сум`
                  : null
              }
            />
            <Field
              label="Цена продажи"
              value={
                product.sellingPrice
                  ? `${Number(product.sellingPrice).toLocaleString("ru-RU")} сум`
                  : null
              }
            />
            <Field
              label="НДС"
              value={product.vatRate ? `${product.vatRate}%` : null}
            />
            <Field label="IKPU код" value={product.ikpuCode} mono />
            <Field
              label="Срок годности"
              value={
                product.shelfLifeDays ? `${product.shelfLifeDays} дней` : null
              }
            />
            <Field
              label="Мин. остаток"
              value={
                product.minStockLevel > 0 ? String(product.minStockLevel) : null
              }
            />
          </div>
          {product.description && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground">Описание</p>
              <p className="text-sm mt-0.5">{product.description}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: any;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={`font-medium ${mono ? "font-mono text-xs" : ""}`}>
        {value || "—"}
      </p>
    </div>
  );
}

// ============================================================================
// Batches Tab
// ============================================================================

function BatchesTab({ productId }: { productId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["product-batches", productId],
    queryFn: async () => {
      const res = await productsApi.getBatches(productId);
      return (res.data?.data ?? res.data ?? []) as any[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const batches = data || [];

  return (
    <Card>
      <CardContent className="pt-4">
        {batches.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Нет партий
          </p>
        ) : (
          <div className="space-y-2">
            {batches.map((batch: any) => (
              <div
                key={batch.id}
                className="flex items-center gap-4 rounded-lg border p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {batch.batchNumber}
                    </Badge>
                    <Badge
                      variant={
                        batch.status === "in_stock"
                          ? "default"
                          : batch.status === "depleted"
                            ? "secondary"
                            : "outline"
                      }
                      className="text-xs"
                    >
                      {batch.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Остаток: {Number(batch.remainingQuantity).toFixed(1)} /{" "}
                    {Number(batch.quantity).toFixed(1)} {batch.unitOfMeasure}
                    {batch.purchasePrice &&
                      ` · ${Number(batch.purchasePrice).toLocaleString("ru-RU")} сум/ед.`}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground shrink-0">
                  {batch.expiryDate && <p>Годен до: {batch.expiryDate}</p>}
                  {batch.receivedDate && <p>Получено: {batch.receivedDate}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
