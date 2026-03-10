"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Leaf,
} from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { productsApi } from "@/lib/api";
import Link from "next/link";
import type { Product } from "./product-types";
import { statusColors } from "./product-types";

export function IngredientsTab() {
  const t = useTranslations("products");
  const tCommon = useTranslations("common");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [confirmState, setConfirmState] = useState<{
    title: string;
    action: () => void;
  } | null>(null);
  const queryClient = useQueryClient();

  const ingredientCategories = useMemo(
    () => [
      { key: "All", label: t("catAll") },
      { key: "coffee_beans", label: t("ingCatCoffeeBeans") },
      { key: "coffee_instant", label: t("ingCatCoffeeInstant") },
      { key: "tea", label: t("ingCatTea") },
      { key: "chocolate", label: t("ingCatChocolate") },
      { key: "milk", label: t("ingCatMilk") },
      { key: "sugar", label: t("ingCatSugar") },
      { key: "cream", label: t("ingCatCream") },
      { key: "syrup", label: t("ingCatSyrup") },
      { key: "water", label: t("ingCatWater") },
      { key: "cups", label: t("ingCatCups") },
      { key: "other", label: t("ingCatOther") },
    ],
    [t],
  );

  const statusConfig = useMemo(
    () => ({
      active: { ...statusColors.active, label: t("statusInStock") },
      low_stock: { ...statusColors.low_stock, label: t("statusLow") },
      out_of_stock: {
        ...statusColors.out_of_stock,
        label: t("statusOutOfStock"),
      },
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

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: ingredients,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["ingredients", debouncedSearch, selectedCategory],
    queryFn: () =>
      productsApi
        .getAll({
          search: debouncedSearch,
          category: selectedCategory !== "All" ? selectedCategory : undefined,
          type: "ingredient",
        })
        .then((res) => res.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: productsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ingredients"] });
      toast.success(t("ingredientDeleted"));
    },
    onError: () => {
      toast.error(t("ingredientDeleteFailed"));
    },
  });

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">{tCommon("loadError")}</p>
        <p className="text-muted-foreground mb-4">
          {t("loadIngredientsFailed")}
        </p>
        <Button
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: ["ingredients"] })
          }
        >
          {tCommon("retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex items-center justify-end">
        <Link href="/dashboard/products/new?type=ingredient">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t("addIngredient")}
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("totalIngredients")}
                </p>
                <p className="text-2xl font-bold">{ingredients?.length || 0}</p>
              </div>
              <Leaf className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("activeIngredients")}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {ingredients?.filter((i: Product) => i.status === "active")
                    .length || 0}
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
                  {t("runningLow")}
                </p>
                <p className="text-2xl font-bold text-yellow-600">
                  {ingredients?.filter((i: Product) => i.status === "low_stock")
                    .length || 0}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchProduct")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {ingredientCategories.slice(0, 6).map((cat) => (
            <Button
              key={cat.key}
              variant={selectedCategory === cat.key ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat.key)}
            >
              {cat.label}
            </Button>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {tCommon("more")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {ingredientCategories.slice(6).map((cat) => (
                <DropdownMenuItem
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                >
                  {cat.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Ingredients Table */}
      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            <div className="space-y-0 divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : ingredients?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Leaf className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">{t("ingredientsNotFound")}</p>
            <p className="text-muted-foreground mb-4">
              {t("addFirstIngredient")}
            </p>
            <Link href="/dashboard/products/new?type=ingredient">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t("addIngredient")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("ingredient")}
                    </TableHead>
                    <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("sku")}
                    </TableHead>
                    <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("category")}
                    </TableHead>
                    <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("unitMeasure")}
                    </TableHead>
                    <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("purchasePrice")}
                    </TableHead>
                    <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("minStock")}
                    </TableHead>
                    <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {tCommon("status")}
                    </TableHead>
                    <TableHead className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {tCommon("actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border">
                  {ingredients?.map((item: Product) => {
                    const status =
                      statusConfig[item.status] || statusConfig.active;
                    return (
                      <TableRow
                        key={item.id}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-green-50 rounded-lg flex items-center justify-center">
                              <Leaf className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <span className="font-medium">{item.name}</span>
                              {item.nameUz && (
                                <p className="text-xs text-muted-foreground">
                                  {item.nameUz}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {item.sku}
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {item.category}
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {unitLabels[
                            item.unitOfMeasure as keyof typeof unitLabels
                          ] || item.unitOfMeasure}
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {item.purchasePrice
                            ? formatPrice(item.purchasePrice)
                            : "\u2014"}
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {item.minStockLevel || "\u2014"}
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${status.bgColor} ${status.color}`}
                          >
                            {status.label}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={tCommon("actions")}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <Link href={`/dashboard/products/${item.id}`}>
                                <DropdownMenuItem>
                                  <Eye className="h-4 w-4 mr-2" />
                                  {tCommon("view")}
                                </DropdownMenuItem>
                              </Link>
                              <Link
                                href={`/dashboard/products/${item.id}/edit`}
                              >
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  {tCommon("edit")}
                                </DropdownMenuItem>
                              </Link>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setConfirmState({
                                    title: t("deleteIngredient"),
                                    action: () =>
                                      deleteMutation.mutate(item.id),
                                  });
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {tCommon("delete")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

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
