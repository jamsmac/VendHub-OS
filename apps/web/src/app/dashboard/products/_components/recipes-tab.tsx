"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Eye,
  FlaskConical,
  Leaf,
  Clock,
  Thermometer,
  CupSoda,
  ChevronRight,
  Layers,
  CheckCircle,
} from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { productsApi } from "@/lib/api";
import Link from "next/link";
import type { Product, Recipe, RecipeIngredient } from "./product-types";
import { recipeTypeColors } from "./product-types";

export function RecipesTab() {
  const t = useTranslations("products");
  const tCommon = useTranslations("common");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{
    title: string;
    action: () => void;
  } | null>(null);
  useQueryClient();

  const recipeTypeLabels: Record<string, { label: string; color: string }> =
    useMemo(
      () => ({
        primary: {
          label: t("recipeTypePrimary"),
          color: recipeTypeColors.primary,
        },
        alternative: {
          label: t("recipeTypeAlternative"),
          color: recipeTypeColors.alternative,
        },
        promotional: {
          label: t("recipeTypePromo"),
          color: recipeTypeColors.promotional,
        },
        test: { label: t("recipeTypeTest"), color: recipeTypeColors.test },
      }),
      [t],
    );

  const unitLabels = useMemo(
    () => ({
      g: t("unitG"),
      kg: t("unitKg"),
      ml: t("unitMl"),
      l: t("unitL"),
      pcs: t("unitPcs"),
      pack: t("unitPack"),
      box: t("unitBox"),
      portion: t("unitPortion"),
      cup: t("unitCup"),
    }),
    [t],
  );

  const formatPrice = (price: number) => {
    return (
      new Intl.NumberFormat("uz-UZ").format(price) + " " + tCommon("currency")
    );
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds} ${t("secShort")}`;
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return sec > 0
      ? `${min} ${t("minShort")} ${sec} ${t("secShort")}`
      : `${min} ${t("minShort")}`;
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Get all products first, then fetch recipes for each
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["products", "with-recipes"],
    queryFn: () =>
      productsApi.getAll({ limit: 500 }).then((res) => res.data.data),
  });

  // Fetch recipes for all products (aggregated)
  const { data: allRecipes, isLoading: recipesLoading } = useQuery({
    queryKey: ["all-recipes", products?.map((p: Product) => p.id)],
    queryFn: async () => {
      if (!products || products.length === 0) return [];
      const recipePromises = products
        .filter((p: Product) => !p.isIngredient)
        .map(async (p: Product) => {
          try {
            const res = await productsApi.getRecipes(p.id);
            const recipes = res.data.data || res.data || [];
            return recipes.map((r: Recipe) => ({
              ...r,
              product: { id: p.id, name: p.name, imageUrl: p.imageUrl },
            }));
          } catch {
            return [];
          }
        });
      const results = await Promise.all(recipePromises);
      return results.flat();
    },
    enabled: !!products && products.length > 0,
  });

  const isLoading = productsLoading || recipesLoading;

  const filteredRecipes = useMemo(() => {
    if (!allRecipes) return [];
    if (!debouncedSearch) return allRecipes;
    const q = debouncedSearch.toLowerCase();
    return allRecipes.filter(
      (r: Recipe) =>
        r.name?.toLowerCase().includes(q) ||
        r.product?.name?.toLowerCase().includes(q),
    );
  }, [allRecipes, debouncedSearch]);

  // Selected recipe detail
  const selectedRecipeData = useMemo(
    () => filteredRecipes.find((r: Recipe) => r.id === selectedRecipe),
    [filteredRecipes, selectedRecipe],
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("recipesTotal")}
                </p>
                <p className="text-2xl font-bold">{allRecipes?.length || 0}</p>
              </div>
              <FlaskConical className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("recipesActive")}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {allRecipes?.filter((r: Recipe) => r.isActive).length || 0}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("recipesWithProducts")}
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {new Set(allRecipes?.map((r: Recipe) => r.product?.id))
                    .size || 0}
                </p>
              </div>
              <Layers className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("searchRecipe")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Recipes list */}
      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            <div className="space-y-0 divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-24 ml-auto" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filteredRecipes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FlaskConical className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">{t("recipesNotFound")}</p>
            <p className="text-muted-foreground mb-4">{t("recipesHint")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("recipe")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("product")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("type")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("time")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("volume")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("costShort")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {tCommon("status")}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {tCommon("actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRecipes.map((recipe: Recipe) => {
                    const typeInfo =
                      recipeTypeLabels[recipe.typeCode] ||
                      recipeTypeLabels.primary;
                    return (
                      <tr
                        key={recipe.id}
                        className="hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedRecipe(recipe.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center">
                              <FlaskConical className="h-5 w-5 text-blue-600" />
                            </div>
                            <span className="font-medium">{recipe.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {recipe.product?.name || "\u2014"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${typeInfo.color}`}
                          >
                            {typeInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {recipe.preparationTimeSeconds
                            ? formatTime(recipe.preparationTimeSeconds)
                            : "\u2014"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {recipe.servingSizeMl
                            ? `${recipe.servingSizeMl} ${t("unitMl")}`
                            : "\u2014"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {recipe.totalCost > 0
                            ? formatPrice(recipe.totalCost)
                            : "\u2014"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              recipe.isActive
                                ? "bg-green-100 text-green-600"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {recipe.isActive
                              ? tCommon("active")
                              : tCommon("inactive")}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <ChevronRight className="h-4 w-4 text-muted-foreground inline-block" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recipe Detail Dialog */}
      <Dialog
        open={!!selectedRecipe}
        onOpenChange={(open) => {
          if (!open) setSelectedRecipe(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-blue-600" />
              {selectedRecipeData?.name || t("recipe")}
            </DialogTitle>
          </DialogHeader>

          {selectedRecipeData && (
            <div className="space-y-4">
              {/* Basic info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">{t("product")}</p>
                  <p className="font-medium">
                    {selectedRecipeData.product?.name}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("type")}</p>
                  <Badge variant="secondary">
                    {recipeTypeLabels[selectedRecipeData.typeCode]?.label ||
                      selectedRecipeData.typeCode}
                  </Badge>
                </div>
                {selectedRecipeData.preparationTimeSeconds && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">
                        {t("preparationTime")}
                      </p>
                      <p className="font-medium">
                        {formatTime(selectedRecipeData.preparationTimeSeconds)}
                      </p>
                    </div>
                  </div>
                )}
                {selectedRecipeData.temperatureCelsius && (
                  <div className="flex items-center gap-2">
                    <Thermometer className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">
                        {t("temperature")}
                      </p>
                      <p className="font-medium">
                        {selectedRecipeData.temperatureCelsius}&deg;C
                      </p>
                    </div>
                  </div>
                )}
                {selectedRecipeData.servingSizeMl && (
                  <div className="flex items-center gap-2">
                    <CupSoda className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">
                        {t("servingVolume")}
                      </p>
                      <p className="font-medium">
                        {selectedRecipeData.servingSizeMl} {t("unitMl")}
                      </p>
                    </div>
                  </div>
                )}
                {selectedRecipeData.totalCost > 0 && (
                  <div>
                    <p className="text-muted-foreground">{t("costShort")}</p>
                    <p className="font-medium">
                      {formatPrice(selectedRecipeData.totalCost)}
                    </p>
                  </div>
                )}
              </div>

              {/* Ingredients list */}
              {selectedRecipeData.ingredients &&
                selectedRecipeData.ingredients.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">
                      {t("ingredientsTitle")}
                    </h4>
                    <div className="border rounded-lg divide-y">
                      {selectedRecipeData.ingredients
                        .sort(
                          (a: RecipeIngredient, b: RecipeIngredient) =>
                            a.sortOrder - b.sortOrder,
                        )
                        .map((ing: RecipeIngredient) => (
                          <div
                            key={ing.id}
                            className="flex items-center justify-between px-3 py-2 text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <Leaf className="h-3.5 w-3.5 text-green-600" />
                              <span>
                                {ing.ingredient?.name || t("ingredient")}
                              </span>
                              {ing.isOptional && (
                                <Badge variant="outline" className="text-xs">
                                  {tCommon("optional")}
                                </Badge>
                              )}
                            </div>
                            <span className="text-muted-foreground">
                              {ing.quantity}{" "}
                              {unitLabels[
                                ing.unitOfMeasure as keyof typeof unitLabels
                              ] || ing.unitOfMeasure}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
            </div>
          )}

          <DialogFooter>
            {selectedRecipeData?.product?.id && (
              <Link
                href={`/dashboard/products/${selectedRecipeData.product.id}`}
              >
                <Button variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  {t("openProduct")}
                </Button>
              </Link>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmState}
        onOpenChange={(open) => {
          if (!open) setConfirmState(null);
        }}
        title={confirmState?.title ?? ""}
        onConfirm={() => confirmState?.action()}
      />
    </div>
  );
}
