/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InlineCreateSelect } from "@/components/forms/InlineCreateSelect";
import { productsApi, api } from "@/lib/api";

const UNITS = [
  { value: "gram", label: "г" },
  { value: "milliliter", label: "мл" },
  { value: "piece", label: "шт" },
  { value: "kilogram", label: "кг" },
  { value: "liter", label: "л" },
];

interface RecipeIngredientRow {
  id?: string;
  ingredientId: string;
  ingredientName?: string;
  quantity: number;
  unitOfMeasure: string;
  isOptional: boolean;
  sortOrder: number;
  unitCost?: number;
}

interface RecipeTabProps {
  productId: string;
}

export function RecipeTab({ productId }: RecipeTabProps) {
  const queryClient = useQueryClient();

  // Fetch recipes for this product
  const { data: recipes, isLoading } = useQuery({
    queryKey: ["product-recipes", productId],
    queryFn: async () => {
      const res = await productsApi.getRecipes(productId);
      return (res.data?.data ?? res.data ?? []) as any[];
    },
  });

  const activeRecipe = recipes?.find((r: any) => r.isActive) || recipes?.[0];

  // Fetch ingredients for active recipe
  const { data: ingredients } = useQuery({
    queryKey: ["recipe-ingredients", activeRecipe?.id],
    queryFn: async () => {
      const res = await api.get(
        `/products/${productId}/recipes/${activeRecipe.id}`,
      );
      const recipe = res.data?.data ?? res.data;
      return (recipe?.ingredients ?? []) as RecipeIngredientRow[];
    },
    enabled: !!activeRecipe?.id,
  });

  const [rows, setRows] = useState<RecipeIngredientRow[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Initialize rows from API data
  if (ingredients && !initialized) {
    setRows(
      ingredients.map((ing: any, idx: number) => ({
        id: ing.id,
        ingredientId: ing.ingredientId,
        ingredientName: ing.ingredient?.name || ing.ingredientName,
        quantity: Number(ing.quantity),
        unitOfMeasure: ing.unitOfMeasure || "gram",
        isOptional: ing.isOptional || false,
        sortOrder: ing.sortOrder || idx + 1,
        unitCost: ing.ingredient?.purchasePrice
          ? Number(ing.ingredient.purchasePrice)
          : undefined,
      })),
    );
    setInitialized(true);
  }

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!activeRecipe?.id) return;
      await productsApi.updateRecipe(productId, activeRecipe.id, {
        ingredients: rows.map((r, idx) => ({
          ingredientId: r.ingredientId,
          quantity: r.quantity,
          unitOfMeasure: r.unitOfMeasure,
          isOptional: r.isOptional,
          sortOrder: idx + 1,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["recipe-ingredients", activeRecipe?.id],
      });
      toast.success("Рецепт сохранён");
    },
    onError: () => toast.error("Ошибка сохранения"),
  });

  const addRow = () => {
    setRows([
      ...rows,
      {
        ingredientId: "",
        quantity: 0,
        unitOfMeasure: "gram",
        isOptional: false,
        sortOrder: rows.length + 1,
      },
    ]);
  };

  const removeRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const updateRow = (
    index: number,
    field: keyof RecipeIngredientRow,
    value: any,
  ) => {
    const updated = [...rows];
    (updated[index] as any)[field] = value;
    setRows(updated);
  };

  // Calculate totals
  const totalCost = rows.reduce((sum, r) => {
    if (!r.unitCost || r.isOptional) return sum;
    return sum + r.quantity * r.unitCost;
  }, 0);

  const product = useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      const res = await productsApi.getById(productId);
      return res.data?.data ?? res.data;
    },
  });

  const sellingPrice = Number(product.data?.sellingPrice || 0);
  const profit = sellingPrice - totalCost;
  const margin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!activeRecipe) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-4">Рецепт не создан</p>
          <Button
            onClick={() => {
              productsApi
                .createRecipe(productId, {
                  name: "Основной рецепт",
                  typeCode: "primary",
                  ingredients: [],
                })
                .then(() => {
                  queryClient.invalidateQueries({
                    queryKey: ["product-recipes", productId],
                  });
                  toast.success("Рецепт создан");
                });
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Создать рецепт
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cost Summary Bar */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-muted-foreground">Себестоимость</p>
            <p className="text-lg font-bold text-orange-600">
              {Math.round(totalCost).toLocaleString("ru-RU")} сум
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-muted-foreground">Цена продажи</p>
            <p className="text-lg font-bold">
              {sellingPrice.toLocaleString("ru-RU")} сум
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-muted-foreground">Прибыль</p>
            <p
              className={`text-lg font-bold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {Math.round(profit).toLocaleString("ru-RU")} сум
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-muted-foreground">Маржа</p>
            <p className="text-lg font-bold">{margin.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Recipe Ingredients Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            Ингредиенты ({rows.length})
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={addRow}>
              <Plus className="h-4 w-4 mr-1" />
              Добавить
            </Button>
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Сохранить
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Добавьте ингредиенты в рецепт
            </p>
          ) : (
            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-[1fr_100px_80px_60px_80px_40px] gap-2 text-xs font-medium text-muted-foreground px-2">
                <span>Ингредиент</span>
                <span>Расход</span>
                <span>Ед.</span>
                <span>Опц.</span>
                <span>Стоимость</span>
                <span></span>
              </div>

              {rows.map((row, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-[1fr_100px_80px_60px_80px_40px] gap-2 items-center rounded-lg border p-2"
                >
                  {/* Ingredient select */}
                  <InlineCreateSelect
                    endpoint="/products"
                    value={row.ingredientId || null}
                    onChange={(id, item) => {
                      updateRow(idx, "ingredientId", id || "");
                      if (item) {
                        updateRow(idx, "ingredientName", item.name);
                        updateRow(
                          idx,
                          "unitCost",
                          Number(item.purchasePrice || 0),
                        );
                      }
                    }}
                    displayField="name"
                    secondaryField="sku"
                    searchParam="search"
                    placeholder="Ингредиент..."
                    createFields={[
                      { name: "name", label: "Название", required: true },
                      { name: "sku", label: "SKU" },
                    ]}
                  />

                  {/* Quantity */}
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={row.quantity}
                    onChange={(e) =>
                      updateRow(
                        idx,
                        "quantity",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    className="h-9"
                  />

                  {/* Unit */}
                  <Select
                    value={row.unitOfMeasure}
                    onValueChange={(v) => updateRow(idx, "unitOfMeasure", v)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => (
                        <SelectItem key={u.value} value={u.value}>
                          {u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Optional */}
                  <div className="flex justify-center">
                    <Checkbox
                      checked={row.isOptional}
                      onCheckedChange={(c) => updateRow(idx, "isOptional", !!c)}
                    />
                  </div>

                  {/* Cost */}
                  <span className="text-xs text-muted-foreground text-right">
                    {row.unitCost
                      ? `${Math.round(row.quantity * row.unitCost).toLocaleString("ru-RU")}`
                      : "—"}
                  </span>

                  {/* Remove */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeRow(idx)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
